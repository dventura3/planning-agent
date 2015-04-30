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

      for(var i=0; i<boards.length; i++)
        getDescription(boards[i], ["use_case01"]);

      algorithms = new algorithms_module.AlgorithmsManager(__dirname);

      console.log("Server configured");
      console.log("Server listening to %s:%d", host, port);
    });
  } catch (e) {
    console.log("Error in reading file for configuration");
  }
});

/*--------------- Helper Functions -------------------*/

var getDescription = function(board, paths){
  var options = {
    host: board.host,
    port: board.port,
    path: "/",
    method: 'OPTIONS'
  };
  try {
    var req = http.request(options, function(resp){
      resp.on('data', function(chunk){
        //save the RESTdesc descriptions for each use_case
        paths.forEach(function(use_case_path){
          var file_name = __dirname + "/descriptions/" + use_case_path + "/RESTdesc_descriptions/board_" + board.ID + ".n3";
          fs.writeFile(file_name, chunk, function(err) {
            if(err) {
              console.log(err);
            } else {
              console.log("The RESTdesc description was saved!");
            }
          });
        });
      });
      resp.on('end', function(out){
        //nothing to do
      });
    });
    req.on('error', function (err) {
      console.log("Board "+ board.host + ":" + board.port + " to get RESTdesc descriptions not response!");
    });
    req.end();
  }
  catch(e){
     console.log(e);
  };
}


var getStatusCode = function(sc){
  var response = {
    "@context": "http://www.w3.org/ns/hydra/context.jsonld",
    "@type": "Status",
    "statusCode": sc
  }
  return response;
}


/*--------------- HTTP Calls -------------------*/

var getEntryPoint = function(req, res) {
  res.send(getStatusCode(501));
}

var getPlanOnlyBoard = function(req, res){
  var boardID_required = req.params.boardID;
  for(var i=0; i<boards.length; i++){
    if(boards[i].ID == boardID_required){
      algorithms.runAlgorithm_OnlyBoard(boards[i]);
      res.send(getStatusCode(200));
      return 0;
    }
  }
  res.send(getStatusCode(404));
}


app.get("/", getEntryPoint);
app.get("/planOnlyBoard/:boardID", getPlanOnlyBoard);
