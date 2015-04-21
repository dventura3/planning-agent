(function() {

  var LineByLineReader = require('line-by-line');


  var Parser = function(directory){
  
  	this.path = directory;

  	this.readParserFile = function(){

      var file = this.path + '/descriptions/use_case01/outputs/parser.n3';
      lr = new LineByLineReader(file);

      /*
      prefixes = { vocab: 'http://www.example.org/vocab#',
        http: 'http://www.w3.org/2011/http#',
        hydra: 'http://www.w3.org/ns/hydra/core#',
        iot: 'https://iotdb.org/pub/iot#',
        st: 'http://www.mystates.org/states#'
      }
      */
      var prefixes = {};

      /*
      {
        lemma3: {
          operation : {
            "@id" : "/plants/",
            "method" : GET,
            "expect" : null,
            "return" : "vocab:PlantsCollection"
          }
        }
      }
      */
      var lemmas = {};



      /*
      plans = [
        {
          lemma : "lemma3",
          hasLemmasCheDipendonoDaLui : [
            {
              lemma : "lemma4",
              hasLemmasCheDipendonoDaLui : []
            }
          ]
        }
      ]
      */
      var plans = [];

      var i = 0;

      lr.on('error', function (err) {
          // 'err' contains error object
          console.log("Error in reading file line by line!");
      });

      lr.on('line', function (line) {

          //if I have a comment, ignore it!
          if(/^#/.test(line)){
            console.log("Comment Line (" + i + "): " + line);
          }

          //if I have a prefix, convert it in context
          if(/^@prefix/.test(line)){
            console.log("Prefix Line (" + i + "): " + line);
            context = {};
          }

          i++;
      });

      lr.on('end', function () {
          // All lines are read, file is closed now.
          console.log("End File");
      });

  	}

  }

  exports.Parser = Parser;

})();