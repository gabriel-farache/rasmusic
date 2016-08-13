var express = require('express');
var myParser = require('body-parser');
var fs = require('fs');
var Player=require('player');
var app = express();
var util = require('util')
var exec = require('child_process').exec;
try{
	var PORT = 8888;

	var ERROR = -1;
	var MP3_CURRENT_PLAYING_TITLE_CODE=0;
	var MP3_FILE_WRITE_ERROR_CODE=1;
	var MP3_PLAYING_CODE = 2;
	var MP3_PAUSED_RESUMED_CODE = 3;
	var MP3_STOPED_CODE = 4;
	var MP3_PLAYLIST_CODE=5;
	var MP3_NEXT_SONG_CODE=7;
	var MP3_PLAY_NEXT_SONG_CODE=8;
	var SOUND_LEVEL_UP=9;
	var SOUND_LEVEL_DOWN=10;
	var SOUND_LEVEL_SET=11;
	var MP3_SELECTED_SONG_PLAYING=12;

	var SONGS_FOLDER_PATH = '/tmp/RasMusic';

	var title = "";
	var playingPosition = -1;
	var playingSongs = [];
	var playingSongsWithPath = [];

	var player = new Player();
	var songSoundLevel = 75;
	var isPlaying = false;

	app.use( myParser.json({
		limit:'50mb',
		extended : true
	}));       // to support JSON-encoded bodies
	app.use(myParser.urlencoded({     // to support URL-encoded bodies
	  limit: '50mb',
	  extended: true
	})); 

	app.use(function(err, req, res, next) {
	    if(!err) return next(); // you also need this line
	    console.log(err);
	    console.log(req);
	    res.send("error!!!");
	});

	function writeReceivedFile(req){
		var fileToPlayJSON=req.body;
		title = fileToPlayJSON.title;

		fs.writeFile(SONGS_FOLDER_PATH + title, fileToPlayJSON.data, 'base64', function(err) {
		    if(err) {
		    	return err;
		    } else {
		    	return 0;
		    }
		});
	}

	app.get('/playingInfo', function(req, res) {
		res.setHeader('Content-Type', 'application/json');
		var message = "No playing song";
		
		if (playingPosition >= 0){
			message = playingSongs[playingPosition];
		}
		res.write("{code: \""+MP3_CURRENT_PLAYING_TITLE_CODE+"\", message: \""+message+"\" }\n");
		res.end();
	});

	app.get('/playlist', function(req, res) {
		res.setHeader('Content-Type', 'application/json');
		var message = "No playslit";
		
		if (playingSongs.length > 0){
			message = playingSongs;
		}

		res.write("{code: \""+MP3_PLAYLIST_CODE+"\", message: \""+message+"\" }\n");
		res.end();
	});

	app.get('/nextSong', function(req, res) {
		res.setHeader('Content-Type', 'application/json');
		var message = "No next song";

		if (playingPosition >= 1){
			message = playingSongs[playingPosition+1];
		}

		res.write("{code: \""+MP3_NEXT_SONG_CODE+"\", message: \""+message+"\" }\n");
		res.end();
	});

	app.post('/play', function(req, res) {
		var err = writeReceivedFile(req);

		res.setHeader('Content-Type', 'application/json');
		if(isPlaying){
			player.stop();
		}
	    if(err) {
	    	res.write("{code: \""+MP3_FILE_WRITE_ERROR_CODE+"\", message: \""+err+"\" }\n");
			console.log(err);
	    } else {
	    	exec("amixer set 'PCM' "+songSoundLevel+"%");
	    	console.log("title: "+title);
	    	playingSongs.unshift(title);
	    	playingSongsWithPath.unshift(SONGS_FOLDER_PATH+title);
			playingPosition = 0;

	    	console.log(playingSongsWithPath);

	    	player = new Player(playingSongsWithPath);
	    	player
			  .on('playing', function(song) {
			    console.log('I\'m playing... ');
			  })
			  .on('playend', function(song) {
			    console.log('Play done, Switching to next one ...');
			    playingPosition++;
			    if(playingPosition >= playingSongs.length) {
			    	isPlaying = false;
			    }
			  })
			  .on('error', function(err) {
			    console.log('Error');
			    console.log(err);
			    playingPosition++;
			    if(playingPosition >= playingSongs.length) {
			    	isPlaying = false;
			    }
			  })
			  .play(function(err, player){
			    console.log('playend!');
			    console.log(err);
			  });
			isPlaying = true;
	    	res.write("{code: \""+MP3_PLAYING_CODE+"\", message: 'The song "+title+" is playing' }\n");
	    }
	    res.end();
	});

	app.post('/setSoundLevel', function(req, res) {
		var newSoundLevel=parseInt(req.body.soundLevel, 10);
		if (newSoundLevel >= 0 || newSoundLevel <= 100){
			soundLevel = newSoundLevel;
			exec("amixer set 'PCM' "+newSoundLevel+"%");
		}	
		res.write("{code: \""+SOUND_LEVEL_SET+"\", message: 'Sound level at "+newSoundLevel+"%' }\n");
		res.end();
	});

	app.put('/addToPlaylist', function(req, res) {
		var err = writeReceivedFile(req);

		res.setHeader('Content-Type', 'application/json');

	    if(err) {
	    	res.write("{code: \""+MP3_FILE_WRITE_ERROR_CODE+"\", message: \""+err+"\" }\n");
			console.log(err);
	    } else {
	    	player.add(SONGS_FOLDER_PATH+title);
	    	playingSongs.push(title);
	    	playingSongsWithPath.push(SONGS_FOLDER_PATH+title)
	    	res.write("{code: \""+MP3_PLAYING_CODE+"\", message: 'The song "+title
	    		+" is added to the playlist', position: \""+playingSongs.length+"\"' }\n");
	    }
	    res.end();
	});



	app.patch('/soundUp', function(req, res) {
		if(songSoundLevel < 100) {
			songSoundLevel++;
			exec("amixer set 'PCM' "+songSoundLevel+"%");
		}
		res.write("{code: \""+SOUND_LEVEL_UP+"\", message: 'Sound level at "+songSoundLevel+"%' }\n");
		res.end();
	});

	app.patch('/soundDown', function(req, res) {
		if (songSoundLevel > 0){
			songSoundLevel--;
			exec("amixer set 'PCM' "+songSoundLevel+"%");
		}	
		res.write("{code: \""+SOUND_LEVEL_UP+"\", message: 'Sound level at "+songSoundLevel+"%' }\n");
		res.end();
	});

	app.patch('/pauseResume', function( req, res) {
		player.pause();
		res.setHeader('Content-Type', 'application/json');
		res.write("{code: \""+MP3_PAUSED_RESUMED_CODE+"\", message: 'Player paused/resumed ("+playingSongs[0]+")'}\n");
		res.end();
	});

	app.patch('/next', function( req, res) {
		var message = "No next song, continue playing current one if any playing";
		if(playingPosition < playingSongs.length){
			playingPosition++;
			message = "Next song: "+playingSongs[playingPosition]+" is now playing";
			player.next();
		}
		
		res.setHeader('Content-Type', 'application/json');
		res.write("{code: \""+MP3_PLAY_NEXT_SONG_CODE+"\", message: \""+message+"\" }\n");
		res.end();
	});

	app.patch('/playSongPlaylist', function( req, res) {
		var posititionToPlay = req.body.positionInPlaylist;
		player.stop();
		isPlaying = false;
		player = new Player(playingSongsWithPath.slice(posititionToPlay));
		player
		  .on('playing', function(song) {
		    console.log('I\'m playing... ');
		    isPlaying = true;;
		  })
		  .on('playend', function(song) {
		    console.log('Play done, Switching to next one ...');
		    playingPosition++;
		    if(playingPosition >= playingSongs.length) {
		    	isPlaying = false;
		    }
		  })
		  .on('error', function(err) {
		    console.log('Error');
		    console.log(err);
		    playingPosition++;
		    if(playingPosition >= playingSongs.length) {
		    	isPlaying = false;
		    }
		  })
		  .play(function(err, player){
		    console.log('playend!');
		    console.log(err);
		  });
		  
		  playingPosition = posititionToPlay;
		  
		
		res.setHeader('Content-Type', 'application/json');
		res.write("{code: \""+MP3_SELECTED_SONG_PLAYING+"\", message: 'Song "+
			playingSongsWithPath[playingPosition]+
			" is playing.' }\n");
		res.end();
	});

	app.delete('/stop', function(req, res) {
		player.stop();
		res.setHeader('Content-Type', 'application/json');
		playingSongs = [];
		playingSongsWithPath = [];
		res.write("{code: \""+MP3_STOPED_CODE+"\", message: 'Player stopped' }\n");
		res.end();
	});


	app.listen(PORT);
} catch (ex) {
    console.log(ex);
  }
