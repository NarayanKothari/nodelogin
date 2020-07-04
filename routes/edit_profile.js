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

//Edit Profile route
router.get('/editProfileReq',ensureAuthenticated,(req,res)=>{
	res.render('editProfile')
})

router.post('/editProfile', ensureAuthenticated, function(req, res, next){	
    User.updateOne({ _id: req.user.id}, req.body, function(err, user){
        if(!user){
            req.flash('error', 'No account found');
            return res.redirect('/edit');
        }
        var nameNew = req.body.name;
        if(!nameNew){
           req.flash('error_msg', 'invalid user name');
           res.redirect('editProfileReq')
        }
        else{
            user.name = nameNew;
            res.redirect('/dashboard');
        }
    });
})

module.exports = router;