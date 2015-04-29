var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var algorithms_module = require('./lib/AlgorithmsManager');

var http = require('http');


/*--------------- Express configuration goes here: -------------------*/
var app = express();
var port = process.env.PORT || 3301;
var host = process.env.HOST || "127.0.0.1";

app.use(
  function crossOrigin(req,res,next){
    res.header('Access-Control-Allow-Origin','*');
    res.header('Access-Control-Allow-Methods','GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers','Content-Type, Authorization, Content-Length, X-Requested-With');

    if('OPTIONS' == req.method){
        res.sendStatus(200);
    }
    else
        next();
  }
);
app.use(bodyParser.json());
//app.use(express.static(__dirname + '/public'));
app.listen(port, host, function() {
  //configuration
  try {
    fs.readFile('lib/fakeBoards.json', function(err, data){
      if (err) throw err;
      
      boards = JSON.parse(data).boards;

      //TODO: Here should be done all the HTTP requestes to the boards to obtain the RESTdesc descriptions
      //NB: I have to add the boardID => used to identify the directory (or the single FileName) contained
      //the RESTdesc descriptions for each board!!!

      algorithms = new algorithms_module.AlgorithmsManager(__dirname);

      console.log("Server configured");
      console.log("Server listening to %s:%d", host, port);
    });
  } catch (e) {
    console.log("Error in reading file for configuration");
  }
});


/*--------------- HTTP Calls -------------------*/

var getEntryPoint = function(req, res) {
  res.send({success:true});
}

var getPlanOnlyBoard = function(req, res){
  var boardID_required = req.params.boardID;
  for(var i=0; i<boards.length; i++){
    if(boards[i].ID == boardID_required){
      algorithms.runAlgorithm_OnlyBoard(boards[i]);
      res.send({success:true});
      return;
    }
  }
  res.send({success:false});
}

var getDescription = function(req, res){
  var options = {
    host: "127.0.0.1",
    port: 3300,
    path: "/",
    method: 'OPTIONS'
  };

  //put data
  var req = http.request(options, function(resp){
    resp.on('data', function(chunk){
      //data = JSON.parse(chunk);
      console.log("DATA: " + chunk);
      res.send({success:true});
    });
    resp.on('end', function(out){
      //nothing to do
    });
  });
  req.end();
}


app.get("/", getEntryPoint);
app.get("/planOnlyBoard/:boardID", getPlanOnlyBoard);
app.get("/getDescription", getDescription);
