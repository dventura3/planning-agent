(function() {

  var sys = require('sys');
  var exec = require('child_process').exec;

  var Reasoner = function(path, eyePath){
    this.path_default = path + "/descriptions";
    this.eyePath = eyePath;

    //boardID is used for knowing the directory or the single RESTdesc descriptions returned by an HTTP Option
    this.generatePlanToKnowPlantInfo = function(boardID, callback){

      var _this = this;

      var cmd = this.eyePath;
      cmd += " --traditional --quick-answere --tactic transaction ";
      cmd += this.path_default + "/use_case01/RESTdesc_descriptions/board_" + boardID + "/*.n3 ";
      cmd += this.path_default + "/use_case01/RESTdesc_descriptions/inference/*.n3 ";
      cmd += this.path_default + "/use_case01/RESTdesc_descriptions/vocabulary/*.n3 ";
      cmd += this.path_default + "/use_case01/knowledge.n3 ";
      cmd += " --query ";
      cmd += this.path_default + "/use_case01/goal01.n3 ";
      cmd += " > " + this.path_default + "/use_case01/outputs/out.n3";

      exec(cmd, function (error, stdout, stderr) {
        if (error !== null) {
          console.log('CMD 1 - Exec error: ' + error);
          return -1;
        }

        var cmd2 = _this.eyePath;
        cmd2 += " --traditional ";
        cmd2 += _this.path_default + "/use_case01/outputs/out.n3 ";
        cmd2 += _this.path_default + "/use_case01/parser/services.n3 ";
        cmd2 += " --query ";
        cmd2 += _this.path_default + "/use_case01/parser/composition.n3 ";
        cmd2 += " --nope ";
        cmd2 += " > " + _this.path_default + "/use_case01/outputs/parser.n3";

        exec(cmd2, function (error, stdout, stderr) {
          if (error !== null) {
            console.log('CMD 2 - Exec error: ' + error);
            return -1;
          }
          console.log("Generated plan for knowing Plants Info");

          callback();
        });

      });

    };

  }

  exports.Reasoner = Reasoner;

})();