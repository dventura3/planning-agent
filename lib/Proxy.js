(function() {

  var reasoner_module = require('./Reasoner');
  var parser_module = require('./Parser');
  var http = require('http');
  var jsonld = require('jsonld');

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
          ne eseguo una, all'interno della callback stessa, vedo se ne devo eseguire un'altra - tipo ricorsione
          */    
    
          var num_executions = 0;

          executeRequest(resulted_plans.plans[plan_id], resulted_plans.lemmas, 0, function(){

            if(num_executions == resulted_plans.lemmas[plan_id].length){
              //here non più executeRequest
              //here the result elaborated in base of the function => I mean we are inside the
              //function "getPlantsInfo" => So we have to return exactly what the Algorithms wants
            }
            else{
              //again executeRequest
              num_executions++;

              //(1) read the id of the next lemma to execute => calcolo l'id che mi aspetto (facendo "-1")
              //(2) navigo dal return del lemma attuale (just executed) to the id che aspetto.
              //mentre navigo mi devo segnare quali sono le proprietà che incontro, per capire come 
              //arrivare all'id che mi interessa!
              //(3) il percorso mi serve perchè poi nel jsonld restituito dall'invocazione del servizio
              //devo eseguire lo stesso identico path

              /*
              "p:lemma9"....
              "@type" : "Collection" => Se ci fosse scritto questo sarebbe più facile da capire che questa è una collection e che ha come proprietà "member".... ma serve saperlo?
                //alla fine io so che se questa risorsa ha la proprietà "member" non può essere 
                //una collection!!! Non posso sbagliare!
              */


            }

          });

        });
      });
      
    }

  }

  var executeRequest = function(plan, lemmas, index_current_lemma, callback){

    var data = {};
    var context = {};

    if(lemmas[plan[index_current_lemma]].operation.method == 'GET'){

      var options = {
        host: '127.0.0.1',
        port: 3300,
        path: lemmas[plan[index_current_lemma]].operation["@id"]
      };

      http.get(options, function(resp){
        resp.on('data', function(chunk){
          data = JSON.parse(chunk);
          
          //config for new get
          splitted_context = data["@context"].split("/");
          options_context = {
            host: '127.0.0.1',
            port: 3300,
            path: ("/contexts/" + splitted_context[splitted_context.length-1])
          }

          //get the context
          http.get(options_context, function(resp){
            resp.on('data', function(chunk){
              context = JSON.parse(chunk);
              //convert into more readable format
              data["@context"] = context;
              jsonld.expand(data, function(err, expanded) {
                console.log(JSON.stringify(expanded));

                //todo > andare avanti nel ciclo di lemmi
                //callback();
              });

            });
          }).on("error", function(e){
            console.log("Got error: " + e.message);
          });

        });
      }).on("error", function(e){
        console.log("Got error: " + e.message);
      });
    }
  }

  exports.Proxy = Proxy;

})();