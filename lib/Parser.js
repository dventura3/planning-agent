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
      var file = path + 'outputs/parser.n3';
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
            //here we have the real RDF statement
            /*
            I COULD CONVERT THE LINE IN RDF => BUT Come faccio a sapere che è convertibile? [quella con c:details non lo è]
            Posso convertirla riga per riga... manualmente....
            p:lemma => p tramite prefix so cosa è => <http://...#lemma4>
            a => a
            c:ServiceCall => <http://...#ServiceCall>

            Se so che è una ServiceCall (di quel tipo che immagino io, so con precizione che il soggetto è un lemma)
            
            inoltre devo salvarmi lo stato precedente... cioè devo sapere a che punto del file sono
            giunta tra: Definizione dei lemmi, definizione delle dipendenze e dettagli per ogni singolo lemma.

            */
            /*
            line = line.replace(/^\s+/, '');
            splitted_line = line.split(/\s+/);
            console.log(splitted_line);
            for(var x=0; x<splitted_line.length; x++){

            }
            */

            if(line == "" || line == null) { /* empty row - ignore */ }
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
              console.log("Current Stage: c:details");
            }
            else {
              //here I'M inside the details related the previous lemma
              console.log("Current Stage: Description lemma");
            }

          }

          i++;
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

  exports.Parser = Parser;

})();