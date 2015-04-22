(function() {

  var LineByLineReader = require('line-by-line');


  var Parser = function(directory){
  
    this.path = directory;

    /*
    * TODO
    * Maybe it's better to pass che directory of files as input of the function
    */
    this.readParserFile = function(){

      var path = this.path + '/descriptions/use_case01/';
      var file = path + 'outputs/parser_goal01.n3';
      lr = new LineByLineReader(file);

      /*
      Example:
      prefixes = {
        "vocab" : "http://www.blablabla.org/1/#",
        "ont" : "http://www.ahahah.org/#",
        "c" : "urn:composition#"
      }
      */
      var prefixes = {};


      var lemmas = {};

      /*
      Example:
      plans = [
        ["p:lemma1", "p:lemma2"],  > Plan1: p:lemma1 has to be executed before to p:lemma2
        ["p:lemma3"]               > Plan2
      ]
      */
      var plans = [];

      var prefix_useful = [];
      c = "urn:composition#";
      p = "file://" + path + 'outputs/out.n3#';
/*
      //goal02
      var tmp_sk_for_lemma = {
        "operationToDo" : {
          "ID" : "_sk8_1",    //I need it just to know if http:body is refer to 
          "method" : "GET",
          "@id" : "<file:///plants/1/>",
          "expects" : null,
          "returns" : "_:sk9_1"
        },
        "_:sk9_1" : {
          "body" : "<file:///plants/1/>"
        },
        "<file:///plants/1/>" : {
          "@id" : "<file:///plants/1/>",
          "@type" : "??? - non conosciuto - ???",
          "<http://www.schema.org/name>" : "_:sk10_1",
          "..." : "..."
        },
        "_:sk12_1" : {
          "@id" : "_:sk12_1",
          "@type" : "vocab:SensorsPlantCollection",
          "hydra:member" : { "@id" : "_:sk17_3"}
        },
        "_:sk17_3" : {
          "@id" : "_:sk17_3",
          "@type" : "vocab:Sensor"
          "supportedProperty" : [
            {
              "@id" : "iot:uuid",
              "domain" : "vocab:Sensor",
              "rainge" : ""
            }
          ]
        }
      };
*/

      var previousLemma = "";

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

                //Music: Sarah Brightman & Enya: Deliver Me => <3
                if(iri_vocabulary == c)
                  prefix_useful[c] = tmp_prefix_vocabulary;
                if(iri_vocabulary == p)
                  prefix_useful[p] = tmp_prefix_vocabulary;
              }
              else if(/:$/.test(splitted_line[x])){
                tmp_prefix_vocabulary = splitted_line[x].replace(/:/,'');
                prefixes[tmp_prefix_vocabulary] = '';
              }
            }
          }
          else{
            //here we have the real RDF statements
            
            if(line == "" || line == null) { /* Empty row - ignore it! */ }
            else if(line.indexOf(prefix_useful[c]+":ServiceCall") > -1){
              lemmas[line.split(/\s+/)[0]] = {};
            }
            else if(line.indexOf(prefix_useful[c]+":hasDependency") > -1){
              lemmaSX = line.split(/\s+/)[0];
              lemmaDX = line.split(/\s+/)[2].replace('.','');
              if(plans.length == 0){
                plans.push([lemmaDX,lemmaSX]); //for the first rowfirst row
              }
              else{
                var last_plan = plans[plans.length-1];
                if(lemmaDX == last_plan[last_plan.length-1]) //same plan of previous raw
                  plans[plans.length-1].push(lemmaSX);
                else
                  plans.push([lemmaDX,lemmaSX]); //new plan
              }
            }
            else if(line.indexOf(prefix_useful[c]+":details") > -1){
              //Example of line >>> p:lemma4 c:details {_:sk8_1 http:methodName "GET".
              tokens = line.split(/\s+/);
              if (typeof(lemmas[tokens[0]].operation) === 'undefined')
                lemmas[tokens[0]].operation = {};
              lemmas[tokens[0]].operation.ID = tokens[2].replace('{','');
              lemmas[tokens[0]].operation.method = tokens[4].replace('"','').replace('".','');
              previousLemma = tokens[0]; //save the id of the currently lemma useful in the next "else"
            }
            else {
              //here I'm inside the details related the previous lemma
              line = line.replace(/^\s+/, ''); //remove the black spaces ath the beginning
              tokens = line.split(/\s+/);
              if(isTheProperty(tokens[1], "http://www.w3.org/2011/http#", "requestURI" , prefixes)){
                //Examples of line >>> (1) _:sk8_1 http:requestURI <file:///plants/1/>.  OR  (2) _:sk100_1 http:requestURI _:sk67_4.
                if(isIRI(tokens[2])) //case (1)
                  lemmas[previousLemma].operation["@id"] = tokens[2].replace(/<file:\/\//, '').replace(/>./, '');
                else //case (2)
                  lemmas[previousLemma].operation["@id"] = { "@id" : tokens[2].replace('.', '') };
              }
            }
          }

      });

      lr.on('end', function () {
          // All lines are read, file is closed now.
          console.log("End File");

          //I search if all the lemmas are at least one time in the plants array. In case, I add them
          var lemmas_names = Object.keys(lemmas);
          for(var q=0; q<lemmas_names.length; q++){
            var isInsert = false;
            for(var i=0; i<plans.length; i++){
              for(var x=0; x<plans[i].length; x++){
                if(plans[i][x] == lemmas_names[q]){
                  isInsert = true;
                  break;
                }
              }
            }
            if(isInsert == false)
              plans.push([lemmas_names[q]]);
            //Music: Imagine Dragons: It's Time
          }

          console.log(lemmas);
          console.log(plans);
      });

    }

  }


  var isTheProperty = function(searchedProperty, vocabulary, entity, prefixes){
    property = searchedProperty.split(":");
    if(property.length > 1){
      if(prefixes[property[0]] == vocabulary && property[1] == entity)
        return true;
      return false
    }
    return false;
  }

  var isIRI = function(supposedIRI){
    if(/<file:\/\/(.*?)>./.test(supposedIRI))
      return true;
    return false;
  }


  exports.Parser = Parser;

})();