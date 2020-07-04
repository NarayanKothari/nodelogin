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

//Image Settings
let gfs;

const test_db = require('../config/keys').MongoURI;

const conn = mongoose.createConnection(test_db,{ useNewUrlParser : true });

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: test_db,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// Uploading the image 
router.post('/upload_image', upload.single('image'), ensureAuthenticated,(req, res, next) => { 
	    User.findOne({ email: req.user.email})
	    .then(user =>{
	    	if(!user){
	    		req.flash('error_msg', 'Unkown user');
	    	}
	    	if(user.img){
		    	gfs.remove({filename: user.img, root:'uploads'}, (err, gridStore) => {
	    		    if (err) {
				    	req.flash('error_msg','Could not delete the image');;
				    }
		    	})
	    	}
	    	user.img = req.file.filename;
	    	user.save()
	    	.then(user =>{
	    		req.flash('success_msg','Successfully uploaded');
	    		res.redirect('/dashboard');
	    	})
	    	.catch(err => console.log(err));
	    })
}); 

//upload image
router.get('/upload_image', ensureAuthenticated, (req,res) => res.render("image_upload"));

//Route to get the image and send it using readstream
router.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

module.exports = router;