(function() {

	var Planner = function(){

		/*
		plan = [
			{
				"planID" : "p:lemma1",
				"numberExpectedReturnedURLs" : "multiple",
				"path" : ["http://www.hydra-cg.com/core#member"]
			},
			{
				"planID" : "p:lemma2",
				"numberExpectedReturnedURLs" : "single",
				"path" : ["http://www.vocab.com/1v#hasSomething", "http://www.vocab.com/1v#hasSomethingElse"]
			},
			{
				"planID" : "p:lemma3"
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
				// (2) salvo the longest plan in "plan = ["p:lemma1", "p:lemma2", "p:lemma3"]"
				
			}
			else{

				// (1) ciclo per trovare the shortest plan. Ex: ["p:lemma4"] instead ["p:lemma1", "p:lemma2", "p:lemma3"]
				// (2) salvo the shortest plan in "plan = ["p:lemma4"]"

			}

			// (3) estraggo e salvo in lemmas_related_plan solo i lemmi che hanno per id proprio gli elementi contenuti nel piano
			// (4) devo costruirmi il vero e proprio "plan", cioè devo capire come arrivare ai vari URLs da invocare.
			//		 Per tanto eseguo le seguenti azioni (CICLICHE!):
			//		 (4.a) prendo il lemma successivo (next_lemma) rispetto a quello attualmente considerato (se non è l'ultimo) e
			//					 determino _:skX_Y riguardante il lemma attualmente considerato.
			//		 (4.b) determino la lista di proprietà da dover seguire per arrivare all'_:skX_Y (che mi dirà l'URL o gli URLs
			//					 da invocare per progredire nella sequenza di lemmi all'interno del plan).
			// A questo punto dovrei avere la variabile "plan" completa come nell'esempio sopra.
			// Fare attenzione alle collection vs single URL.

		}


		/*
		*	Next part of plan to execute. If there isn't, it send something... (or execute an other function callback?)
		*/
		this.runPlan = function(board, data, cb_nextExecution, cb_planCompleted){

			if(index_current_lemma != (plan.length-1) /* todo && (tmp_buffer_forEach_Calling) */ ){
				//ricorsione

				// (1) check if the next lemma to execute returns multiple URLs or only one.
				// (2) confronto data ricevuto dalla http request eseguita con il corrente piano
				//		 perchè devo prendere i successivi URL da eseguire. Attenzione se ho "multiple" URL
				//		 dovroò fare qualcosa sul tmp_buffer_forEach_Calling...
				//		 inoltre la prima volta (eseguito sul Proxy) "data" è un buffer vuoto... da gestire!
				// (3) se ne torna tanti, dovrei fare un ciclo di "cb_nextExecution" e salvarmi il fatto
				//		 che non devo incrementare index_current_lemma ogni volta che 


				//ready for the next cycle
				index_current_lemma++;

				/*
				* board = object board (to know host and port)
				* url = for example: /plants/
				* requestType = for example: GET
				*/
				cb_nextExecution(board, url, requestType, this.runPlan);
			}
			else if(index_current_lemma == (plan.length-1)){
				//get the result
				console.log("########## STOP! ##########");

				cb_planCompleted(); //other callback to execute only when the plan was completed
			} 
			else{
				//save in the buffer e "decrement" tmp_buffer_forEach_Calling (in realtà non è un intero...
				//quindi non posso decrementare.... ma devo fare qualcosa!) 
			}

		}
	}



	exports.Planner = Planner;

});