(function() {

  var reasoner_module = require('./Reasoner');
  var parser_module = require('./Parser');
  var http = require('http');

  var Proxy = function(__dirname){

    var reasoner = new reasoner_module.Reasoner(__dirname,  "eye");
    var parser = new parser_module.Parser(__dirname);

    var files_matching = {
      use_case01 : {
        getPlantsInfo : "goal01.n3",
        getSensorsValues : "goal02.n3",
        setActuatorState : "goal03.n3"
      }
    }
    
    //Music: Adele - One and Only
    this.getPlantsInfo = function(boardID){
      
      reasoner.generatePlanForFirstUseCase(boardID, files_matching.use_case01.getPlantsInfo, function(){
        parser.readParserFile('use_case01/outputs/parser.n3', function(resulted_plans){
          //I select the (first) longest plan because the shortest could be not complete!
          //The problem is that the shortest says to directly invoke </plants/1> but If I don't know how
          //many plants I have... so I decide to use the longest plan that should be also the more complete.
          var plan_id = 0; //plan to execute
          var current_max_num_lemmas = 0;
          for(var i=0; i<resulted_plans.plans.length; i++){
            if(resulted_plans.plans[i].length > current_max_num_lemmas){
              current_max_num_lemmas = resulted_plans.plans[i].length;
              plan_id = i;
            }
          }

          /*
          ne eseguo una, all'interno della calback stessa, vedo se ne devo eseguire un'altra - tipo ricorsione
          */    
    
          executeRequest(resulted_plans.plans[plan_id], resulted_plans.lemmas, 0);

        });
      });
      
    }

  }

  var executeRequest = function(plan, lemmas, index_current_lemma){

    var options = {
      host: '127.0.0.1',
      port: 3300,
      path: lemmas[plan[index_current_lemma]].operation["@id"]
    };

    if(lemmas[plan[index_current_lemma]].operation.method == 'GET'){
      http.get(options, function(resp){
        resp.on('data', function(chunk){
          //do something with chunk
          console.log("Request done! Response: " + chunk);
        });
      }).on("error", function(e){
        console.log("Got error: " + e.message);
      });
    }
  }

  exports.Proxy = Proxy;

})();