(function() {

	var proxy_module = require('./Proxy');

  var AlgorithmsManager = function(__dirname){
    this.path = __dirname;
    var proxy = new proxy_module.Proxy(this.path);

    this.firstUseCase = function(boardID){

      var plants = proxy.getPlantsInfo(boardID);

    }

  };

  /*
  *	This function contains the cycling list of operations to do in order to execute the 1th
  *	use case: monitoring and optimal management of plants' habitat using only the sensors and
  *	actuators physically connected to a board.
  *	The cycling operations are: 1) get the plants' info stored in the board in order to know
  *	the optimal environmental conditions (ideal temperature, moisture and light for morning,
  *	afternoon and night); 2) get the real and actual sensor's values (nb: in base of the sensors
  *	associated to each plant) - supposing every 5 minutes; 3) if the values are ok (within an 
  * confident intervall) => nothing to do. If the values are
  *	not ok => it's necessary to understand how to act. I mean, if the temperature is not in
  *	line with the ideal values, the conseguence is to compose and execute the plan that allows
  *	knowing the fan/heater associated to the plant and changing its state. If the soil moisture is
  *	not in line with sensors values, the pump should be activated/stopped.
	*/
  AlgorithmsManager.prototype.managementUsingOnlyBoard = function(boardID){

    /*
    Suppose to have returned an object like this (look at the goal01):
    plants = [
      {
        plantID : 1,
        idealTemperature : 20,
        idealMoisture : 30,
        idealLight : 15
      }
    ]
    */
  	var plants = proxy.getPlant(boardID);

    //Instead to execute during each cycle the plans => I Generate it, before of all.
    //TODO

  	//The algorithm will be run every 5 seconds (for simulation we use seconds instead minutes).
  	setInterval(function(){
  		/*
  		Suppose to have returned an object like this:
			currentEnvironment = {
				temperature : 30,
				moisture : 18,
				light : 25
			}
  		*/
  		currentEnvironment = proxy.getCurrentSensorsValues(plant);

  		//TODO: Who understand that is morning? or afternoon? or night? PROBABLY it!
  		if(currentEnvironment.temperature > plant.idealMorning.temperature)
  			proxy.switchOnFan(plant);
  		else if (currentEnvironment.temperature < plant.idealMorning.temperature) //could be used an heater?
  			proxy.switchOffFan(plant);

  		//confident intervall: more that 5% of soil moisture
  		if(currentEnvironment.moisture > (plant.idealMorning.moisture + 5))
  			proxy.switchOnIrrigationSystem(plant);
  		else if (currentEnvironment.moisture <= plant.idealMorning.moisture)
  			proxy.switchOffIrrigationSystem(plant);

  		if(currentEnvironment.light > (plant.idealMorning.light + 5))
  			proxy.switchOnLamp(plant);
  		else if (currentEnvironment.light <= plant.idealMorning.light)
  			proxy.switchOffLamp(plant);

		}, 5000);
  }


  exports.AlgorithmsManager = AlgorithmsManager;

})();