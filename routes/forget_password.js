const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const fs = require('fs'); 
const path = require('path'); 
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const {ensureAuthenticated} = require('../config/auth');

// User model
const User = require('../models/User');

//Forgot Password Page
router.get('/forgot', (req,res) => res.render("forgot"));

//Reset page
router.get('/reset/:token', (req, res) => {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error_msg', 'Password reset token is invalid or has expired.');
      return res.redirect('/users/forgot');
    }
    res.render("reset", {
      user: req.user,
      token: req.params.token
    });
  });
});

//Reset Password route
router.post('/reset/:token', (req, res) => {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error_msg', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        if(req.body.password != req.body.password2){
          req.flash('error_msg', 'Password do not match');
          return res.redirect('back');
        }
		bcrypt.genSalt(10, (err, salt)=>
			bcrypt.hash(req.body.password, salt, (err,hash) =>{
				if(err) throw err;
				// set password to hashed
				user.password = hash;
		        user.resetPasswordToken = undefined;
				user.resetPasswordExpires = undefined;
				user.save(function(err) {
 					req.logIn(user, function(err) {
   					done(err, user);
  					});
				});
			}));
        // user.password = req.body.password;
      	});
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        auth: {
          user: 'griffinkamina@gmail.com',
          pass: 'kothari1997'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'griffinkamina@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success_msg', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/users/login');
  });
});

//Forgot Password route
router.post('/forgot', (req, res, next) => {
	let errors = [];
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },

    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
		  errors.push({ msg: 'No account with that email address exists.'});
          //req.flash('error', 'No account with that email address exists.');
          return res.render('forgot',{
          	errors
          });
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        auth: {
          user: 'griffinkamina@gmail.com',
          pass: 'kothari1997'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'griffinkamina@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/users/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success_msg', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/users/forgot');
  });
});


module.exports = router;