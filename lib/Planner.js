(function() {

	var Planner = function(){

		/*
		plan = [
			{
				"lemmaID" : "p:lemma1",
				"path" : ["http://www.hydra-cg.com/core#member"]
			},
			{
				"lemmaID" : "p:lemma2",
				"path" : ["http://www.vocab.com/1v#hasSomethingElse", "http://www.vocab.com/1v#hasSomething"]
			},
			{
				"lemmaID" : "p:lemma3"
			}
		]
		*/
		var plan = []; //list of ordered lemmas to invoke to reach the plan
		var lemmas_related_plan = {}; //lemmas related only the plan
		var index_current_lemma = 0;

		/*
		buffer_resources_dependencies = {
			"p:lemmaA" : [
				{
					"@id" : "/plants/",
					"dependantFrom" : ""
				}
			],
			"p:lemmaB" : [
				{ 
					"@id" : "/plants/1"
					"dependantFrom" : "/plants/"
				},
				{ 
					"@id" : "/plants/2"
					"dependantFrom" : "/plants/"
				}
			],
			"p:lemmaC" : [
				{ 
					"@id" : "/sensors/1"
					"dependantFrom" : "/plants/1"
				},
				{ 
					"@id" : "/sensors/2"
					"dependantFrom" : "/plants/2"
				}
			]
		}
		*/
		var buffer_resources_dependencies = {};


		/*
		* Input Parameters: 
		*	type = shortest|longest that means: longer = is the more complete and general 
		*				 plan... also the more complex to manage. shorter = says to directly invoke </plants/ID> (is an example).
		* allPlans = list of all the possible plan to execute in order to reach a goal.
		* allLemmas = all the lemmas related all the plans.
		*/
		this.generatePlan = function(type, allPlans, allLemmas){

			if(type == "longest"){

				// (1) ciclo per trovare the longest plan. Ex: ["p:lemma1", "p:lemma2", "p:lemma3"] instead ["p:lemma4"]
				// (2) salvo the longest plan in "plan = [ {"lemmaID" : "p:lemma1"}, {"lemmaID" : "p:lemma2"}, {"lemmaID" : "p:lemma3"} ]"
				// (3) estraggo e salvo in lemmas_related_plan solo i lemmi che hanno per id proprio gli elementi contenuti nel piano

				var plan_id = 0; //index of plan to execute
        var current_max_num_lemmas = 0;
        for(var i = 0; i < allPlans.length; i++){							//(1)
          if(allPlans[i].length > current_max_num_lemmas){
            current_max_num_lemmas = allPlans[i].length;
            plan_id = i;
          }
        }

        for(var i = 0; i < allPlans[plan_id].length; i++){		//(2) & (3)
        	plan.push({ "lemmaID" : allPlans[plan_id][i] });
        	lemmas_related_plan[allPlans[plan_id][i]] = allLemmas[allPlans[plan_id][i]];
        }

			}
			else{

				// (1) ciclo per trovare the shortest plan. Ex: ["p:lemma4"] instead ["p:lemma1", "p:lemma2", "p:lemma3"]
				//		 NB: Se c'è più di un piano con 1 solo lemma... dovrei prendere tutti i piani con 1 solo
				//		 lemma ed eseguirli in parallelo (non in sequenza!)
				// (2) salvo the shortest plan in "plan = ["p:lemma4"]"
				// (3) estraggo e salvo in lemmas_related_plan solo i lemmi che hanno per id proprio gli elementi contenuti nel piano

				//TODO

			}

			// (4) devo costruirmi il vero e proprio "plan", cioè devo capire come arrivare ai vari URLs da invocare.
			//		 Per tanto eseguo le seguenti azioni (CICLICHE!):
			//		 (4.a) prendo il lemma successivo (next_lemma) rispetto a quello attualmente considerato (se non è l'ultimo) e
			//					 determino _:skX_Y riguardante il lemma attualmente considerato.
			//		 (4.b) determino la lista di proprietà da dover seguire per arrivare all'_:skX_Y (che mi dirà l'URL o gli URLs
			//					 da invocare per progredire nella sequenza di lemmi all'interno del plan).
			// A questo punto dovrei avere la variabile "plan" completa come nell'esempio sopra.
			// Fare attenzione alle collection vs single URL.

			for(var i = 0; i < plan.length; i++){
				//what is the last lemma's block ID? It depends from the next lemma to execute!
				if(i != (plan.length-1)){
					var current_lemma_ID = plan[i].lemmaID;
					var next_lemma_ID = plan[(i+1)].lemmaID;

		      var starting_block = lemmas_related_plan[current_lemma_ID].operation.returns;

		      //Example: if "_:sk33_4" (=dependent block of next lemma) => the ending_block is "_:sk33_3"
		      var tmp = lemmas_related_plan[next_lemma_ID].operation["@id"].split("_");
		      var ending_block = "_" + tmp[1] + "_" + (Number(tmp[2]) - 1);								// (4.a)

		      //NB: I use reverse() just to have the sequence of properties from the first (the most external) to the last (the innermost)
		      plan[i].path = generatePropertiesPath(starting_block, ending_block, lemmas_related_plan[current_lemma_ID]).reverse();		// (4.b)
				}
				else { /* here, it is the last lemma of the plan - nothing to do */ }
			}

			console.log("The whole Plan was generated!");
			console.log(plan);

		}


		
		this.runPlan = function(board, data, cb_nextExecution, cb_planCompleted){

			if(index_current_lemma == 0){
				//We are here only for the first time - when I have to execute the first lemma of plan
				var url = lemmas_related_plan[plan[0].lemmaID].operation["@id"];
				var requestType = lemmas_related_plan[plan[0].lemmaID].operation["method"];
				buffer_resources_dependencies[plan[0].lemmaID] = [];
				buffer_resources_dependencies[plan[0].lemmaID].push({
					"@id" : url,
					"dependantFrom" : ""
				});
				cb_nextExecution(board, url, requestType, this.runPlan);
				index_current_lemma++;
			}
			else{
				// (1) Check if I have execute all the lemmas. If the response is "yes" (index_current_lemma == plan.length),
				// I have finished and have to execute the callback "cb_planCompleted". Opposite case,
				// I have to go forward to the next lemma and execute the callback "cb_nextExecution" (1 or more times).
				if(index_current_lemma != plan.length /* todo && (tmp_buffer_forEach_Calling) */ ){

					// (2) Now I have to compare the data returned by HTTP request with the sequence
					//		 of properties for the lemma with "index_current_lemma". The goal is to understand
					//		 what is/are the URL(s) for the next lemma. There are three cases to manage:
					//		 (2.a) the sequence of properties returns a single URL;
					//		 (2.b) the sequence of properties returns a collection of URLs;
					//		 (2.c) the sequence of properties contains one property that is a collection!
					//					 The final property (following the sequence of properties) could be a
					//					 single URL or itself a collection of URLs.
					// NB: For case (2.b) and (2.c) we have to do a cycle of "cb_nextExecution" but not
					//		 increment index_current_lemma for each invocation.

	/*
					TODO
					Forse dovrei come prima operazione vedere l'"@id" dentro "data" in modo da sapere quale
					url ho invocato e di cui "data" è proprio la risposta.
	*/
					var path_for_lemma = plan[(index_current_lemma-1)].path;
					//tmp_current_property: scrematura di data via via in base al path_for_lemma.
					//Serve per sapere se path_for_lemma mi da una lista o un oggetto.
					var tmp_current_property = data[path_for_lemma[0]];
					var _tmp_ = []; //it's always a list of one or more objects (never a list of list)
					_tmp_ = getNextDataToken(tmp_current_property, _tmp_);

					for(var i=1; i < path_for_lemma.length; i++){
						if(hasOneItem(_tmp_)){
							tmp_current_property = _tmp_[0][path_for_lemma[i]];
							_tmp_ = []; //empty
							_tmp_ = getNextDataToken(tmp_current_property, _tmp_);
						}
						else{
							var _copy_tmp_ = _tmp_;
							_tmp_ = []; //empty
							for(var y=0; y<_copy_tmp_.length; y++){
								tmp_current_property = _copy_tmp_[y][path_for_lemma[i]];
								_tmp_ = getNextDataToken(tmp_current_property, _tmp_);
							}
						}
					}

					buffer_resources_dependencies[plan[index_current_lemma].lemmaID] = [];
					for(var h=0; h<_tmp_.length; h++){
						buffer_resources_dependencies[plan[index_current_lemma].lemmaID].push({
							"@id" : _tmp_[h]["@id"],
							"dependantFrom": data["@id"]
						});
					}

					console.log(buffer_resources_dependencies);

					//ready for the next cycle
					//index_current_lemma++;

					
					//cb_nextExecution(board, url, requestType, this.runPlan);
				}
				else if(index_current_lemma == (plan.length-1)){
					//get the result
					//TODO: Pass the result as parameter to the cb_planCompleted, inside of which it has to be elaborated
					//in base of the type operation requested by the alghoritm.

					//considerare anche che l'ultimo lemma potrebbe essere una collection... quindi in realtà cb_planCompleted()
					//deve essere invocato quando l'ultimo url del lemma da la risposta...

					//callback executes only when the plan was completed
					cb_planCompleted();
				} 
				else{
					//save in the buffer e "decrement" tmp_buffer_forEach_Calling (in realtà non è un intero...
					//quindi non posso decrementare.... ma devo fare qualcosa!) 
				}
			}
		}
	}



	/*
	* Suppose that each X lemma has a returned value. A (X+1) lemma depends from one property of X lemma.
	* We use a Bottom-Up Algorithm to generate the path (the sequence of properties to follow) in order
	* to know what is the URL of (X+1) lemma.
	* This function returns a list ("path") that contains the sequence of properties in reverse order.
	* Example: for X lemma, path=["http://www.vocab.com/1v#hasSomething", "http://www.vocab.com/1v#hasSomethingElse"]
	* Using the jsonld returned invoking X lemma, I have to search, first of all, the "hasSomethingElse" property and
	* then the "hasSomething" property. In other words "hasSomething" is an inner property than "hasSomethingElse".
	*/
  var generatePropertiesPath = function(starting_block, ending_block, current_lemma){
    var path = [];

    var searchedID = ending_block;
    var found = false;
    while(!found){
      for(var key in current_lemma){
        if(key != "operation"){
          for(var i=0; i<current_lemma[key].supportedProperty.length; i++){
            if(current_lemma[key].supportedProperty[i].range == searchedID){
              path.push(current_lemma[key].supportedProperty[i]["@id"]);
              searchedID = key;
            }
          }
        }
      }
      //Music: Naya Rivera - Mine
      if(searchedID == starting_block)
        found = true;
    }
    return path;
  }


  /*
  *	Check if a property is an Array.
  */
  var isArray = function(a){
	    return (!!a) && (a.constructor === Array);
	};

	/*
  *	Check if an Array has one or more elements.
  */
	var hasOneItem = function(a){
	    if(a.length == 1)
	    	return true;
	    return false;
	};

	var getNextDataToken = function(tmp_current_property, _tmp_){
		if(isArray(tmp_current_property)){
			for(var x=0; x<tmp_current_property.length; x++)
				_tmp_.push(tmp_current_property[x]);
		}
		else
			_tmp_.push(tmp_current_property);
		return _tmp_;
	}

	exports.Planner = Planner;

})();