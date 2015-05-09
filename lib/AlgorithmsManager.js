(function() {

  var proxy_module = require('./Proxy');
  var async = require("async");


  var AlgorithmsManager = function(_dirname){

    var default_path = _dirname;
    var proxy;

    // Example: actuatorsState = ["http://..../1/1","http://..../2/1", "http://..../3/0"]
    var actuatorsState = {};

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

          var listSensorPlant = [];
          
          var d = new Date();
          var h = d.getHours();
          for(var plant_id in plants){
            var sensors_associated_to_plant = sensors[plant_id];
            if(h>6 & h<=13){
              //idealMorning
              for(var y=0; y<sensors_associated_to_plant.length; y++){
                newElement = checkEnvironmentalCondition(board, plant_id, plants[plant_id].idealMorning, sensors_associated_to_plant[y]);
                listSensorPlant.push(newElement);
              }
            }
            else if(h>13 & h<=21){
              //idealAfternoon
              for(var y=0; y<sensors_associated_to_plant.length; y++){
                newElement = checkEnvironmentalCondition(board, plant_id, plants[plant_id].idealAfternoon, sensors_associated_to_plant[y]);
                listSensorPlant.push(newElement);
              }
            }
            else{
              //idealNight
              for(var y=0; y<sensors_associated_to_plant.length; y++){
                newElement = checkEnvironmentalCondition(board, plant_id, plants[plant_id].idealNight, sensors_associated_to_plant[y]);
                listSensorPlant.push(newElement);
              }
            }
          }

          //NOW EXECUTE!
          //NB: the proxy uses different callbacks and file writings... so I need to execute
          //the actuators' setting operation in sequence!
          async.eachSeries(listSensorPlant, function(element, next){
              proxy.setActuatorState(element.board, element.plantID, element.actuatorState, element.sensorType, function(actuator, error){
                if(error)
                  console.log(error);
                else
                  console.log(">> [Actuator " + actuator.actuatorID + "] set to [" + actuator.actuatorState + "]");
                next();
              });   
          }, function(err){
              if(err) {
                console.log(err);
              } else {
                console.log('Completed to process all the actuators!');
              }
          });

        });
      });
    }


    var checkEnvironmentalCondition = function(board, plantID, idealConditions, sensor){
      
      if(sensor.sensorType == "MoistureSensor"){
        if(sensor.value > idealConditions.moisture){
          return({
            board : board,
            plantID : plantID,
            actuatorState : 0,
            sensorType : "IrrigationPump"
          });
        }
        else {
          return({
            board : board,
            plantID : plantID,
            actuatorState : 1,
            sensorType : "IrrigationPump"
          });
        }
      }
      else if(sensor.sensorType == "TemperatureSensor"){
        if(sensor.value > idealConditions.temperature){
          return({
            board : board,
            plantID : plantID,
            actuatorState : 0,
            sensorType : "Heater"
          });
        }
        else {
          return({
            board : board,
            plantID : plantID,
            actuatorState : 1,
            sensorType : "Heater"
          });
        }
      }
      else if(sensor.sensorType == "LightSensor"){
        if(sensor.value > idealConditions.light){
          return({
            board : board,
            plantID : plantID,
            actuatorState : 0,
            sensorType : "PowerWindow"
          });
        }
        else {
          return({
            board : board,
            plantID : plantID,
            actuatorState : 1,
            sensorType : "PowerWindow"
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
    */
    this.runAlgorithm_BoardAndCurrentWeather = function(board){
      var path_for_useCase_OnlyBoard = default_path + "/descriptions/use_case02";
      proxy = new proxy_module.Proxy(path_for_useCase_OnlyBoard, "use_case02");

      proxy.getPlantsInfo(board, function(plants, err){
        //console.log(plants);

        proxy.getSensorsValueOnBoard(board, function(sensors, err){
          //console.log(sensors);
          
          proxy.getCurrentWeather(board, function(currentWeather, err){
            //console.log(currentWeather);

            proxy.getActuatorsForEachPlant(board, function(actuators, err){
              console.log(actuators);

              /*
              * SBAGLIATO! Se non ho il sensore specifico =>  in questa funzione non ci entro!!!!!
              * MA HO I DATI DEL CURRENT WEATHER!!! => POTREI ENTRARCI! -_-''
              * DEVO VERIFICARE GLI ATTUATORI! => In base al tipo di attuatore => decido cosa posso fare!
              */

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
      });
    }


    this.runAlgorithm_BoardAndWeatherForecastingShortPeriod = function(board){

    }

    this.runAlgorithm_BoardAndWeatherForecastingLongPeriod = function(board){

    }


  }; //end AlgorithmsManager class


  exports.AlgorithmsManager = AlgorithmsManager;

})();