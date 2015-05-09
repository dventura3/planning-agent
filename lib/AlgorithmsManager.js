(function() {

  var proxy_module = require('./Proxy');

  var AlgorithmsManager = function(_dirname){

    var default_path = _dirname;
    var proxy;

    /*
    actuatorsState = [
      {
        "ActuatorID" : 1,
        "state" : 0
      } 
    ]
    */
    var actuatorState = {};

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
        console.log(plants);
        //this callback should be executed every 5 minutes
        proxy.getSensorsValueOnBoard(board, function(sensors){
          console.log(sensors);
          
          var d = new Date();
          var h = d.getHours();
          for(var plant_id in plants){
            var sensors_associated_to_plant = sensors[plant_id];
            if(h>6 & h<=13){
              //idealMorning
              for(var y=0; y<sensors_associated_to_plant.length; y++){
                setTimeout(function (board, plantID, idealConditions, sensor) {
                  checkEnvironmentalCondition(board, plantID, idealConditions, sensor);
                }, y * 1500, board, plant_id, plants[plant_id].idealMorning, sensors_associated_to_plant[y]);
              }
            }
            else if(h>13 & h<=21){
              //idealAfternoon
              for(var y=0; y<sensors_associated_to_plant.length; y++){
                setTimeout(function (board, plantID, idealConditions, sensor) {
                  checkEnvironmentalCondition(board, plantID, idealConditions, sensor);
                }, y * 1500, board, plant_id, plants[plant_id].idealAfternoon, sensors_associated_to_plant[y]);
              }
            }
            else{
              //idealNight
              for(var y=0; y<sensors_associated_to_plant.length; y++){
                setTimeout(function (board, plantID, idealConditions, sensor) {
                  checkEnvironmentalCondition(board, plantID, idealConditions, sensor);
                }, y * 1500, board, plant_id, plants[plant_id].idealNight, sensors_associated_to_plant[y]);
              }
            }
          }

        });
      });
    }


    /*
    * SBAGLIATO! Se non ho il sensore specifico =>  in questa funzione non ci entro!!!!!
    * MA HO I DATI DEL CURRENT WEATHER!!! => POTREI ENTRARCI! -_-''
    * DEVO VERIFICARE GLI ATTUATORI! => In base al tipo di attuatore => decido cosa posso fare!
    */
    var checkEnvironmentalCondition = function(board, plantID, idealConditions, sensor){
      
      /*
        TODO => intervallo di confidenza! => se moisture è compreso tra X en Y, fai così...
      */
      if(sensor.sensorType == "MoistureSensor"){
        if(sensor.value > idealConditions.moisture){
          proxy.setActuatorState(board, plantID, 0, "IrrigationPump", function(actuator){
            console.log("--> [Actuator " + actuator.actuatorID + "] set to [" + actuator.actuatorState + "]");
          });
        }
        else {
          proxy.setActuatorState(board, plantID, 1, "IrrigationPump", function(actuator){
            console.log("--> [Actuator " + actuator.actuatorID + "] set to [" + actuator.actuatorState + "]");
          });
        }
      }
      else if(sensor.sensorType == "TemperatureSensor"){
        if(sensor.value > idealConditions.temperature){
          proxy.setActuatorState(board, plantID, 0, "Heater", function(actuator){
            console.log("--> [Actuator " + actuator.actuatorID + "] set to [" + actuator.actuatorState + "]");
          });
        }
        else {
          proxy.setActuatorState(board, plantID, 1, "Heater", function(actuator){
            console.log("--> [Actuator " + actuator.actuatorID + "] set to [" + actuator.actuatorState + "]");
          });
        }
      }
      else if(sensor.sensorType == "LightSensor"){
        if(sensor.value > idealConditions.light){
          proxy.setActuatorState(board, plantID, 0, "PowerWindow", function(actuator){
            console.log("--> [Actuator " + actuator.actuatorID + "] set to [" + actuator.actuatorState + "]");
          });
        }
        else {
          proxy.setActuatorState(board, plantID, 1, "PowerWindow", function(actuator){
            console.log("--> [Actuator " + actuator.actuatorID + "] set to [" + actuator.actuatorState + "]");
          });
        }
      }
    }


    /*
      Ho bisogno di sapere la fonte dei dati... cioè se sono della board, del current weather, o future...
      Perchè agirò diversamente in funzione di esse.
      Il current weather serve sia come modo per supplire alle mancanze di sensori, sia come maggiori fonti di dati.
      Quindi per ogni pianta, cerco tutti i sensori ad essa associati e mi faccio dare i valori
      Inoltre a priori mi faccio dare il current weather considerando la location della board.
      Avendo questi dati, posso vedere quali attuatori la pianta ha associati e agire di conseguenza.
    
      TODO: Verificare se tutto funziona anche quando il reasoner genera un plan EMPTY!!

    */
    this.runAlgorithm_BoardAndCurrentWeather = function(board){
      var path_for_useCase_OnlyBoard = default_path + "/descriptions/use_case02";
      proxy = new proxy_module.Proxy(path_for_useCase_OnlyBoard, "use_case02");

      proxy.getPlantsInfo(board, function(plants){
        //console.log(plants);

        proxy.getSensorsValueOnBoard(board, function(sensors){
          //console.log(sensors);
          
          proxy.getCurrentWeather(board, function(currentWeather){
            //console.log(currentWeather);

            var d = new Date();
            var h = d.getHours();
            for(var plant_id in plants){
              var sensors_associated_to_plant = sensors[plant_id];
              if(h>6 & h<=13){
                //idealMorning
                for(var y=0; y<sensors_associated_to_plant.length; y++){
                  //TODO
                }
              }
              else if(h>13 & h<=21){
                //idealAfternoon
                for(var y=0; y<sensors_associated_to_plant.length; y++){
                  //TODO
                }
              }
              else{
                //idealNight
                for(var y=0; y<sensors_associated_to_plant.length; y++){
                  //TODO
                }
              }
            }
            /*
            if(isThere("IrrigationPump")){
              //se l'umidità del terreno è basso => switch on
              //se l'umidità del terreno è alta => switch off
            }
            else if(isThere("PowerWindow")){
              //se la temperatura è alta rispetto a quella ideale e fuori la temperatura è più bassa => apro la finestra
              //se la temperatura è alta rispetto a quella ideale e fuori la temperatura è anch'essa alta => chiudo
            
              //se la luce dentro è minore di quella che hanno bisogno le piante, ma fuori c'è una luce più intensa => apro
              //se la luce dentro è maggiore di quella che hanno bisogno le piante => chiudo
            }
            else if(isThere("Heater")){
              //se la temperatura è più bassa rispetto a quella ideale => switch on
              //se la temperatura è alta rispetto a quella ideale => switch off
            }
            */
          });
        });
      });
    }



    this.runAlgorithm_BoardAndWeatherForecastingShortPeriod = function(board){

    }

    this.runAlgorithm_BoardAndWeatherForecastingLongPeriod = function(board){

    }


  }; //end AlgorithmsManager class


  exports.AlgorithmsManager = AlgorithmsManager;

})();