(function() {

  var proxy_module = require('./Proxy');

  var AlgorithmsManager = function(_dirname){

    var default_path = _dirname;
    var proxy;

    /*
    * This function contains the cycling list of operations to do in order to execute the 1th
    * use case: monitoring and optimal management of plants' habitat using only the sensors and
    * actuators physically connected to a board.
    * The cycling operations are: 1) get the plants' info stored in the board in order to know
    * the optimal environmental conditions (ideal temperature, moisture and light for morning,
    * afternoon and night); 2) get the real and actual sensor's values (nb: in base of the sensors
    * associated to each plant) - supposing every 5 minutes; 3) if the values are ok (within an 
    * confident intervall) => nothing to do. If the values are
    * not ok => it's necessary to understand how to act. I mean, if the temperature is not in
    * line with the ideal values, the conseguence is to compose and execute the plan that allows
    * knowing the fan/heater associated to the plant and changing its state. If the soil moisture is
    * not in line with sensors values, the pump should be activated/stopped.
    */
    this.runAlgorithm_OnlyBoard = function(board){
      var path_for_useCase_OnlyBoard = default_path + "/descriptions/use_case01";
      proxy = new proxy_module.Proxy(path_for_useCase_OnlyBoard, "use_case01");

      proxy.getPlantsInfo(board, function(plants){
        //console.log(plants);
        //this callback should be executed every 5 minutes
        proxy.getSensorsValueOnBoard(board, function(sensorsValues){
          //console.log(sensorsValues);
          var d = new Date();
          var h = d.getHours();
          for(var i=0; i<plants.length; i++){
            if(h>6 & h<=13){
              //idealMorning
              for(var y=0; y<sensorsValues.length; y++){
                if(sensorsValues[y].plantID == plants[i].plantID && sensorsValues[y].sensorType == "MoistureSensor")
                  checkMoistureValue(board, plants[i], "idealMorning", sensorsValues[y].value);
              }
            }
            else if(h>13 & h<=21){
              //idealAfternoon
              for(var y=0; y<sensorsValues.length; y++){
                if(sensorsValues[y].plantID == plants[i].plantID && sensorsValues[y].sensorType == "MoistureSensor")
                  checkMoistureValue(board, plants[i], "idealAfternoon", sensorsValues[y].value);
              }
            }
            else{
              //idealNight
              for(var y=0; y<sensorsValues.length; y++){
                if(sensorsValues[y].plantID == plants[i].plantID && sensorsValues[y].sensorType == "MoistureSensor")
                  checkMoistureValue(board, plants[i], "idealNight", sensorsValues[y].value);
              }
            }
          }
        });
      });
    }


    var checkMoistureValue = function(board, plant, partOfDay, currentMoistureValue){
      //confident intervall: more that 5% of soil moisture
      if(currentMoistureValue > (plant[partOfDay].moisture + 5)){
        proxy.setActuatorState(board, plant.plantID, 1, "IrrigationPump", function(actuator){
          console.log("Actuator " + actuator.actuatorID + " set to " + actuator.actuatorState);
        });
      }
      else{
        proxy.setActuatorState(board, plant.plantID, 0, "IrrigationPump", function(actuator){
          console.log("Actuator " + actuator.actuatorID + " set to " + actuator.actuatorState);
        });
      }
    }

  }; //end AlgorithmsManager class




  exports.AlgorithmsManager = AlgorithmsManager;

})();