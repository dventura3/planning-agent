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
                newElement = checkEnvironmentalCondition(board, plant_id, plants[plant_id].idealMorning, sensors_associated_to_plant[y].sensorType, sensors_associated_to_plant[y].value);
                listSensorPlant.push(newElement);
              }
            }
            else if(h>13 & h<=21){
              //idealAfternoon
              for(var y=0; y<sensors_associated_to_plant.length; y++){
                newElement = checkEnvironmentalCondition(board, plant_id, plants[plant_id].idealAfternoon, sensors_associated_to_plant[y].sensorType, sensors_associated_to_plant[y].value);
                listSensorPlant.push(newElement);
              }
            }
            else{
              //idealNight
              for(var y=0; y<sensors_associated_to_plant.length; y++){
                newElement = checkEnvironmentalCondition(board, plant_id, plants[plant_id].idealNight, sensors_associated_to_plant[y].sensorType, sensors_associated_to_plant[y].value);
                listSensorPlant.push(newElement);
              }
            }
          }

          //NOW EXECUTE!
          executeSetActuatorState(listSensorPlant);

        });
      });
    }
    


    /*
    * This function contains the cycling list of operations to do in order to execute the 2th
    * use case: monitoring and optimal management of plants' habitat using the sensors
    * physically connected to a board and this information are integrated with the information
    * given by a weather web API about the current weather codition in the same area where the
    * board is (base on use of geocoordinates).
    */
    this.runAlgorithm_BoardAndCurrentWeather = function(board){
      var path_for_useCase_OnlyBoard = default_path + "/descriptions/use_case02";
      proxy = new proxy_module.Proxy(path_for_useCase_OnlyBoard, "use_case02");

      proxy.getPlantsInfo(board, function(plants, err){
        console.log(plants);

        proxy.getSensorsValueOnBoard(board, function(sensors, err){
          console.log(sensors);
          
          proxy.getCurrentWeather(board, function(currentWeather, err){
            console.log(currentWeather);

            proxy.getActuatorsForEachPlant(board, function(actuators, err){
              console.log(actuators);

              var listSensorPlant = [];

              for(var index in actuators){
                var plantID = actuators[index].plantID;
                if(actuators[index].actuatorType == "IrrigationPump"){
                  //Check (a) if a MoistureSensor is associated to the same plant
                  var currentValue = null;
                  for(var sensor_index in sensors[plantID]){
                    if(sensors[plantID][sensor_index].sensorType == "MoistureSensor"){ //found sensor (a)
                      currentValue = sensors[plantID][sensor_index].value;
                      break;
                    }
                  }
                  //if (a) is not, (b) use the Humidity in the air given by current weather
                  if(currentValue == null){ // get current humidity (b)
                    currentValue = currentWeather.currentHumidity;
                  }
                  //Then, you can decide what status the IrrigationPump should have
                  //in base of the ideal condition.
                  tmp = returnActuatorStateInBaseOfIdealCondition(board, plantID, plants[plantID], "MoistureSensor", currentValue);
                  listSensorPlant.push(tmp);
                }
                else if(actuators[index].actuatorType == "PowerWindow"){
                  var currentValue = null;
                  for(var sensor_index in sensors[plantID]){
                    if(sensors[plantID][sensor_index].sensorType == "LightSensor"){ //found sensor (a)
                      currentValue = sensors[plantID][sensor_index].value;
                      break;
                    }
                  }
                  if(currentValue == null){ // get current currentLightIntensity (b)
                    currentValue = currentWeather.currentLightIntensity;
                  }
                  tmp = returnActuatorStateInBaseOfIdealCondition(board, plantID, plants[plantID], "LightSensor", currentValue);
                  listSensorPlant.push(tmp);
                }
                else if(actuators[index].actuatorType == "Heater"){
                  var currentValue = null;
                  for(var sensor_index in sensors[plantID]){
                    if(sensors[plantID][sensor_index].sensorType == "TemperatureSensor"){ //found sensor (a)
                      currentValue = sensors[plantID][sensor_index].value;
                      break;
                    }
                  }
                  if(currentValue == null){ // get current currentTemperature (b)
                    currentValue = currentWeather.currentTemperature;
                  }
                  tmp = returnActuatorStateInBaseOfIdealCondition(board, plantID, plants[plantID], "TemperatureSensor", currentValue);
                  listSensorPlant.push(tmp);
                }
              }

              //NOW EXECUTE!
              executeSetActuatorState(listSensorPlant);

            });
          });
        });
      });
    }


    var checkEnvironmentalCondition = function(board, plantID, idealConditions, sensorType, currentValue){
      
      if(sensorType == "MoistureSensor"){
        if(currentValue > idealConditions.moisture){
          return returnOneActuatorInfo(board, plantID, 0, "IrrigationPump");
        }
        else {
          return returnOneActuatorInfo(board, plantID, 1, "IrrigationPump");
        }
      }
      else if(sensorType == "TemperatureSensor"){
        if(currentValue > idealConditions.temperature){
          return returnOneActuatorInfo(board, plantID, 0, "Heater");
        }
        else {
          return returnOneActuatorInfo(board, plantID, 1, "Heater");
        }
      }
      else if(sensorType == "LightSensor"){
        if(currentValue > idealConditions.light){
          return returnOneActuatorInfo(board, plantID, 0, "PowerWindow");
        }
        else {
          return returnOneActuatorInfo(board, plantID, 1, "PowerWindow");
        }
      }
    }


    var returnOneActuatorInfo = function(board, plantID, status, sensorType){
      return ({
        board : board,
        plantID : plantID,
        actuatorState : status,
        sensorType : sensorType
      });
    }


    var returnActuatorStateInBaseOfIdealCondition = function(board, plantID, allIdealConditions, sensorType, currentValue){
      var d = new Date();
      var h = d.getHours();
      if(h>6 & h<=13){
        //idealMorning
        return checkEnvironmentalCondition(board, plantID, allIdealConditions.idealMorning, sensorType, currentValue);
      }
      else if(h>13 & h<=21){
        //idealAfternoon
        return checkEnvironmentalCondition(board, plantID, allIdealConditions.idealAfternoon, sensorType, currentValue);
      }
      else{
        //idealNight
        return checkEnvironmentalCondition(board, plantID, allIdealConditions.idealNight, sensorType, currentValue);
      }
    }

    /*
    * This function is used to set the new state for the actuator associated to the plants contained in listSensorPlant.
    * NB: The proxy uses different callbacks and file writings... so I need to execute
    * the actuators' setting operation in sequence! To have this, I'm using "async" nodejs module.
    */
    var executeSetActuatorState = function(listSensorPlant){
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
    }


    this.runAlgorithm_BoardAndWeatherForecastingShortPeriod = function(board){
      var path_for_useCase_OnlyBoard = default_path + "/descriptions/use_case03";
      proxy = new proxy_module.Proxy(path_for_useCase_OnlyBoard, "use_case03");

      proxy.getPlantsInfo(board, function(plants, err){
        //console.log(plants);

        proxy.getSensorsValueOnBoard(board, function(sensors, err){
          //console.log(sensors);
          
          proxy.getHourlyForecastWeather(board, function(hourlyWeather, err){
            console.log(hourlyWeather);
/*
            proxy.getActuatorsForEachPlant(board, function(actuators, err){
              //console.log(actuators);

            });
*/
          });
        });
      });
    }

    this.runAlgorithm_BoardAndWeatherForecastingLongPeriod = function(board){
      var path_for_useCase_OnlyBoard = default_path + "/descriptions/use_case04";
      proxy = new proxy_module.Proxy(path_for_useCase_OnlyBoard, "use_case04");

      proxy.getPlantsInfo(board, function(plants, err){
        //console.log(plants);

        proxy.getSensorsValueOnBoard(board, function(sensors, err){
          //console.log(sensors);
          
          proxy.getDailyForecastWeather(board, function(dailyWeather, err){
            //console.log(dailyWeather);
            console.log(err);

            proxy.getActuatorsForEachPlant(board, function(actuators, err){
              //console.log(actuators);

            });
          });
        });
      });

    }


  }; //end AlgorithmsManager class


  exports.AlgorithmsManager = AlgorithmsManager;

})();