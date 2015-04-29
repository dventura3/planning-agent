(function() {

  var sys = require('sys');
  var exec = require('child_process').exec;

  var Reasoner = function(_dirname, eyePath){
    this.path_default = _dirname;
    this.eyePath = eyePath;


    /*
    * boardID is used for knowing the directory or the single RESTdesc descriptions returned by an HTTP Option
    */
    this.generateAllPlans = function(boardID, goal_file, preference, callback){

      var _this = this;

      var cmd = this.eyePath;
      cmd += " --traditional --quick-answere --tactic transaction ";
      cmd += this.path_default + "/RESTdesc_descriptions/board_" + boardID + "/*.n3 ";
      cmd += this.path_default + "/inference/*.n3 ";
      cmd += this.path_default + "/vocabularies/*.n3 ";
      cmd += this.path_default + "/knowledge.n3 ";
      if(preference)
        cmd += this.path_default + "/preference.n3 "; 
      cmd += " --query ";
      cmd += this.path_default + "/" + goal_file + " ";
      cmd += " > " + this.path_default + "/outputs/out.n3";

      exec(cmd, function (error, stdout, stderr) {
        if (error !== null) {
          console.log('CMD 1 - Exec error: ' + error);
          return -1;
        }

        var cmd2 = _this.eyePath;
        cmd2 += " --traditional ";
        cmd2 += _this.path_default + "/outputs/out.n3 ";
        cmd2 += _this.path_default + "/parser/services.n3 ";
        cmd2 += " --query ";
        cmd2 += _this.path_default + "/parser/composition.n3 ";
        cmd2 += " --nope ";
        cmd2 += " > " + _this.path_default + "/outputs/parser.n3";

        exec(cmd2, function (error, stdout, stderr) {
          if (error !== null) {
            console.log('CMD 2 - Exec error: ' + error);
            return -1;
          }

          callback();
        });

      });

    };

  }

  exports.Reasoner = Reasoner;

})();