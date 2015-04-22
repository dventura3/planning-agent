(function() {

  var reasoner_module = require('./Reasoner');
  var parser_module = require('./Parser');

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
    
    this.getPlantsInfo = function(boardID){
      
      reasoner.generatePlanForFirstUseCase(boardID, files_matching.use_case01.getPlantsInfo, function(){
        parser.readParserFile('use_case01/outputs/parser.n3', function(resulted_plans){
          //I select the longer plan because the shortest could be not complete!
          //The problem is that the shortest is to directly invoke <plants/1> but If I have more plants, I
          //should know that I have more plants... in order to invoke more time the directly URL for each plan.

          console.log(JSON.stringify(resulted_plans));
        });
      });
      
    }

  }

  exports.Proxy = Proxy;

})();