'use strict'

import {Router} from 'express';
import superagent from 'superagent';
import User from '../model/user.js';
import bodyParser from 'body-parser';
import basicAuth from '../middleware/basic-auth.js';

export default new Router()

  .get('/oauth/google', (req,res,next) => {
    // if no google code returned - redirect home
    if(!req.query.code) res.redirect(process.env.CLIENT_URL)
    //otherwise send code back to google for token
    superagent.post('https://www.googleapis.com/oauth2/v4/token')
      .type('form')
      .send({
        code: req.query.code,
        grant_type: 'authorization_code',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.API_URL}/oauth/google`,
      })        
      .then( res => {
        // check to see if we got an access token back - if we did return it to the next .then()
        if(!res.body.access_token) throw new Error('no access token received');
        return res.body.access_token;
      })
      .then( accessToken => {
        //send access token to openID to get user info
        return superagent.get('https://www.googleapis.com/plus/v1/people/me/openIdConnect')
          .set('Authorization', `Bearer ${accessToken}`)
      })
      .then( res => {
        console.log('__OPENID INF0__', res.body);
      })
      .catch( err => {
        console.log(err.message);
        res.redirect(process.env.CLIENT_URL);
      })
  })

  .post('/signup', bodyParser.json() , (req, res, next) => {
    new Account.createFromSignup(req.body)
    .then(user => user.tokenCreate())
    .then(token => {
      res.cookie('X-Slugchat-Token', token)
      res.send(token)
    })
    .catch(next)
  })
  
  .get('/usernames/:username', (req, res, next) => {
    User.findOne({username: req.params.username})
      .then(user => {
        if(!user) return res.sendStatus(200);
        return res.sendStatus(409);
        })
      .catch(next);
  })
  
  .get('/login', basicAuth, (req, res, next) => {
    req.user.tokenCreate()
    .then((token) => {
      res.cookie('X-Slugchat-Token', token)
      res.send(token)
    })
    .catch(next)
  });
