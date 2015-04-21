(function() {

  var LineByLineReader = require('line-by-line');


  var Parser = function(directory){
  
  	this.path = directory;

  	this.readParserFile = function(){

      var file = this.path + '/descriptions/use_case01/outputs/parser.n3';
      lr = new LineByLineReader(file);

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

          if(/^#/.test(line)){ /*if I have a comment, ignore it!*/ }
          else if(/^@prefix/.test(line)){
            //if I have a prefix, convert it in context
            splitted_line = line.split(/\s+/);
            var tmp_prefix_vocabulary = '';
            for(var x=0; x<splitted_line.length; x++){
              if(splitted_line[x] == "@prefix"){ /* pass */ }
              else if(/<(.*?)>\./.test(splitted_line[x])){
                iri_vocabulary = splitted_line[x].match(/<(.*?)>/, '')[1];
                prefixes[tmp_prefix_vocabulary] = iri_vocabulary;
              }
              else if(/:$/.test(splitted_line[x])){
                tmp_prefix_vocabulary = splitted_line[x].replace(/:/,'');
                prefixes[tmp_prefix_vocabulary] = '';
              }
            }
          }
          else{
            //here we have the real RDF data
            line = line.replace(/^\s+/, '');
            splitted_line = line.split(/\s+/);
            //console.log(splitted_line);
          }

          i++;
      });

      lr.on('end', function () {
          // All lines are read, file is closed now.
          console.log("End File");
          console.log(JSON.stringify(prefixes));
      });

  	}

  }

  exports.Parser = Parser;

})();