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
				"path" : ["http://www.vocab.com/1v#hasSomething", "http://www.vocab.com/1v#hasSomethingElse"]
			},
			{
				"lemmaID" : "p:lemma3"
			}
		]
		*/
		var plan = []; //list of ordered lemmas to invoke to reach the plan
		var lemmas_related_plan = {}; //lemmas related only the plan
		var index_current_lemma = 0;
		var tmp_buffer_forEach_Calling = [];

		/*
		*	type = shortest|longest that means: longer = is the more complete and general 
		*				 plan... also the more complex to manage. shorter = says to directly invoke </plants/ID>.
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

		      //Example: if "_:sk33_4" (dependent block of next lemma) => the ending_block is "_:sk33_3"
		      var tmp = lemmas_related_plan[next_lemma_ID].operation["@id"].split("_");
		      var ending_block = "_" + tmp[1] + "_" + (Number(tmp[2]) - 1);								// (4.a)

		      plan[i].path = generatePathToGetNextURL(starting_block, ending_block, lemmas_related_plan[current_lemma_ID]);		// (4.b)
				}
				else { /* here, it is the last lemma of the plan - nothing to do */ }
			}

			console.log(plan);

		}


		/*
		*	Next part of plan to execute. If there isn't, it send something... (or execute an other function callback?)
		*/
		this.runPlan = function(board, data, cb_nextExecution, cb_planCompleted){

			if(index_current_lemma == 0){
				//Here we are only for the first time - when I have to execute the first plan
				var url = lemmas_related_plan[plan[0].lemmaID].operation["@id"];
				var requestType = lemmas_related_plan[plan[0].lemmaID].operation["method"];
				cb_nextExecution(board, url, requestType, this.runPlan);
				index_current_lemma++;
			}
			else{
				if(index_current_lemma != plan.length /* todo && (tmp_buffer_forEach_Calling) */ ){

					// (1) check if the next lemma to execute returns multiple URLs or only one. => potrebbe non servire!
					// (2) confronto data ricevuto dalla http request eseguita con il corrente piano
					//		 perchè devo prendere i successivi URL da eseguire. Attenzione se ho "multiple" URL
					//		 dovroò fare qualcosa sul tmp_buffer_forEach_Calling...
					//		 inoltre la prima volta (eseguito sul Proxy) "data" è un buffer vuoto... da gestire!
					// (3) se ne torna tanti, dovrei fare un ciclo di "cb_nextExecution" e salvarmi il fatto
					//		 che non devo incrementare index_current_lemma ogni volta che 

					console.log(data);					

					//ready for the next cycle
					index_current_lemma++;

					/*
					* board = object board (to know host and port)
					* url = for example: /plants/
					* requestType = for example: GET
					*/
					//cb_nextExecution(board, url, requestType, this.runPlan);
				}
				else if(index_current_lemma == (plan.length-1)){
					//get the result

					cb_planCompleted(); //other callback to execute only when the plan was completed
				} 
				else{
					//save in the buffer e "decrement" tmp_buffer_forEach_Calling (in realtà non è un intero...
					//quindi non posso decrementare.... ma devo fare qualcosa!) 
				}
			}

		}
	}



	/*
	* Bottom-Up Algorithm
	*/
  var generatePathToGetNextURL = function(starting_block, ending_block, current_lemma){
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
  *	Check if a property is a collection - We suppose that to have a collection the property
  * has to be "hydra member".
  */
  var isACollection = function(property){
  	if(property == "http://www.w3.org/ns/hydra/core#member")
  		return true;
  	return false;
  }


	exports.Planner = Planner;

})();