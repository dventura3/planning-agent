# Planning Agent

This module is used to autonomously generate plans that meet the needs of plants in a garden or greenhouse. No pre-knowledge about what an API does and how invoking its services is needed, because the planning agent uses [RESTdesc](http://restdesc.org/) descriptions to discover what services (and how to combine them) can resolve its goals. The production and selection of the plan is done using EYE reasoner. Given a plan composed by sequential HTTP requests, the X service call returns [JSON-LD](http://json-ld.org/) data that will be used as input to invoke the (X+1) service call in the sequence in order to achieve the goal.

For summarizing, the planning agent does the following operations:
- ask for RESTdesc descriptions to all known web services;
- produce plans to monitor the current or forecast weather conditions of plants;
- determine the operations to do in order to guarantee the ideal habitat conditions and produce plans for applying these strategies.

The information about the ideal temperature, soil moisture and light for each plant is provided by the board in which sensors and actuators associated to that plant are physically connected. An implementation of module representing a board is available [here](https://github.com/dventura3/irrigation-api).

The planning agent is also able to use external services (like forecast weather API) in order to apply a more accurate decisional algorithm. The implementation of forecast weather API is available [here](https://github.com/dventura3/weather-forecast-api).


## Algorithms

The planning agent can execute four algorithms progressively more complete.

### Algorithm 1

The first algorithm is the simplest. It uses only the real-time information given by sensors to determine what status the actuators should have. The planning agent generates plans to know the plants monitored by one board and the sensors' values. It compares the current environment conditions with the ideal values and determine the actuators' states.
It is not rare that a plant has associated an actuator but not the correspondent sensor (ex. in a greenhouse could be an heater to warm the environment. A plant could be associated to that heater but doesn't have any associated temperature sensor). In this case, the actuator's state can not be determined.

### Algorithm 2

The second algorithm tries to overcome the lack of sensors' data about the environment condition of plants, using the current weather condition given by a weather API.



## Usage: How to select the Algorithm to execute?

After having cloned the repository, you have to install the Node.js modules with `npm install`.
Now you can run the server through `node index.js`. The default host is `127.0.0.1` and the default port is `3301`. You can change this configuration, setting the two environment variables `HOST` and `PORT`.

During the init phase, the servers got all the newest RESTdesc descriptions by inoking the HTTP OPTIONS on the entry point of all the APIs for the web services that it knows and store it in the `/descriptions/use_caseN` directories.

The server exposes only one service: type: PUT - URL: /run/:useCaseID/:boardID.
This service is used just to set the algorithm to use (useCaseID can be from 1 to 4) and the boardID (currently it is possible to manage one board for time).



