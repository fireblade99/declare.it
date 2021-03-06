var Student = require('../models/student')
var Course = require('../models/course')
var PlanOfStudy = require('../models/planOfStudy')
var async = require('async');


exports.displayForm = function(req, res){
  var name = req.session.json.name || "";
  var advisor = req.session.json.advisor.replace(/\s/g,'').replace(/PrimaryAdvisor/g,'').replace(/,/g,', ') || "";
  // NOTE TO TEST WHAT MY.OLIN.EDU RETURNS 
  res.render('planOfStudyForm', {title: "Engineering Plan of Study", student_name: name, advisor: advisor});
}

exports.displayFilledForm = function(req, res){
	PlanOfStudy.findOne({_id: req.params.planID}).populate('courses').exec(function (err, plan){
		if(err)
			res.send("Could not find and display desired Plan of Study: ", err);
		if (req.query.key) {
			if (plan.keys.indexOf(req.query.key) > -1) {
				res.render('planOfStudyDisplay', {title: "View Plan Of Study", plan: plan, loggedIn: false});
			} else {
				res.send("Invalid URL");
			}
		} else {
			if(!req.session.user || plan.owner != req.session.user._id) {
				res.send("You do not have permission to view this page.");
			} else {
				res.render('planOfStudyDisplay', {title: "View Plan Of Study", plan: plan, loggedIn: true});
			}
		}
	});
}

exports.auth = function(req, res){
	PlanOfStudy.findOne({_id: req.params.planID}).exec(function (err, plan){
		var newKey = Math.floor(Math.random()*100000000000000001);
		var keys = plan.keys;
		keys.push(newKey);
		PlanOfStudy.findOneAndUpdate({ _id : req.params.planID }, { $set: { keys: keys }})
		.exec(function (err, docs) {
			res.send({key: newKey});
		});
	});
}

exports.saveForm = function(req, res){
	// check if the form already exists in the student's array of Plans of Study
	var found = false;

	Student.findOne({username: req.session.user.username}).populate('planOfStudy_forms').exec(function (err, student){
		if(err)
			console.log("Error in checking whether form already exists: ", err);
		// if no error, check if student is modifying form or creating new one
		for(var i=0; i<student.planOfStudy_forms.length; i++){
			if(student.planOfStudy_forms[i].name == req.body.form_name){
				found = true; 
				break; 
			}
		}

		if(found){
			var courseList = [];
			var arr = [];

			async.auto({
				ingesting_user_data: function(callback){
					// combine each individual course entry into array of info 
					var courseNames = [req.body.course1, req.body.course2, req.body.course3, req.body.course4, req.body.course5, req.body.course6, req.body.course7, req.body.course8];
					var courseMTH = [req.body.course1_MTH, req.body.course2_MTH, req.body.course3_MTH, req.body.course4_MTH, req.body.course5_MTH, req.body.course6_MTH, req.body.course7_MTH, req.body.course8_MTH];
					var courseSCI = [req.body.course1_SCI, req.body.course2_SCI, req.body.course3_SCI, req.body.course4_SCI, req.body.course5_SCI, req.body.course6_SCI, req.body.course7_SCI, req.body.course8_SCI];
					var courseENGR = [req.body.course1_ENGR, req.body.course2_ENGR, req.body.course3_ENGR, req.body.course4_ENGR, req.body.course5_ENGR, req.body.course6_ENGR, req.body.course7_ENGR, req.body.course8_ENGR];
					var courseAHSE = [req.body.course1_AHSE, req.body.course2_AHSE, req.body.course3_AHSE, req.body.course4_AHSE, req.body.course5_AHSE, req.body.course6_AHSE, req.body.course7_AHSE, req.body.course8_AHSE];

					// combine each individual course entry into array of info 
					for(var i=0; i<courseNames.length; i++){
						arr.push({
							courseName: courseNames[i], 
							MTH: courseMTH[i], 
							SCI: courseSCI[i], 
							ENGR: courseENGR[i], 
							AHSE: courseAHSE[i]
						});
					}
					// upon successful completion of course list creation, call callback
					callback(null);
				}, 
				populating_course_list: ['ingesting_user_data', function(callback){
					// create a list of course objects 
					async.map(arr, function(item, next){
						var courseType; 
						var courseCredits;
						if(item.MTH != 0){
							courseType = 'MTH';
							courseCredits = item.MTH;
						}else{
							if(item.SCI != 0){
								courseType = 'SCI';
								courseCredits = item.SCI;
							}else{
								if(item.ENGR != 0){
									courseType = 'ENGR';
									courseCredits = item.ENGR;
								}else{
									if(item.AHSE != 0){
										courseType = 'AHSE';
										courseCredits = item.AHSE;
									}else{
										courseType = '';
										courseCredits = '';
									}
								}
							}
						}	
						// for right now, all non-pertinent attributes are just empty strings 
						var newCourse = new Course({section: '', name: item.courseName, credit: courseCredits, grade: '', type: courseType, id: ''});
						newCourse.save(function(err){
							if(err)
								console.log("Couldn't save the new course: ", err);
							courseList.push(newCourse);
							next(null);
						});
					}, function(err, results){
						callback(null, results);
					});
				}], 
				modifying_planOfStudy: ['populating_course_list', function(callback, results){
					PlanOfStudy.update({name: req.body.form_name}, {
						name: req.body.form_name, 
						student_name: req.body.student_name, 
						adviser: req.body.adviser_name, 
						grad_year: req.body.graduation_year, 
						concentration_declaration: req.body.declaration_title,
						
						courses: courseList, 
						MTH_credits: req.body.total_MTH, 
						SCI_credits: req.body.total_SCI, 
						ENGR_credits: req.body.total_ENGR, 
						AHSE_orOther_credits: req.body.total_AHSE, 
						additional_electives_MTH: req.body.additional_MTH, 
						additional_electives_SCI: req.body.additional_SCI, 
						additional_electives_ENGR: req.body.additional_ENGR, 
						additional_electives_AHSE: req.body.additional_AHSE, 

						overlap_toggle_allOlin: req.body.overlap_allOlin_toggle, 
						course_plan_story: req.body.course_plan_text,
						chem_matsci_req: req.body.chem_matsci, 
						phys_req: req.body.phys, 
						design_depth_req: req.body.design_depth,
						overlap_toggle_chemMatsciDesign: req.body.overlap_chemMatsci_toggle

					}, function(err, results){
						if(err)
							console.log("Unable to update plan of study: ", err);
						callback(null, 'done');
					})
		}], 
			}, function (err, result){
				// final callback
				console.log("Successfully ingested and modified Plan of Study");
				res.redirect('/home');
			})
		}
			//form.update({name: req.body.form_name}, {adviser: req.body.adviser_name}, {grad_year: req.body.graduation_year}, {concentration_declaration: req.body.declaration}, {courses: [req.body.course1, req.body.course2, req.body.course3, req.body.course4, req.body.course5, req.body.course6, req.body.course7, req.body.course8]})
		if(!found){
			var courseList = [];
			var arr = [];
			var newPlanOfStudy; 

			async.auto({
				ingesting_user_data: function(callback){
					// combine each individual course entry into array of info 
					var courseNames = [req.body.course1, req.body.course2, req.body.course3, req.body.course4, req.body.course5, req.body.course6, req.body.course7, req.body.course8];
					var courseMTH = [req.body.course1_MTH, req.body.course2_MTH, req.body.course3_MTH, req.body.course4_MTH, req.body.course5_MTH, req.body.course6_MTH, req.body.course7_MTH, req.body.course8_MTH];
					var courseSCI = [req.body.course1_SCI, req.body.course2_SCI, req.body.course3_SCI, req.body.course4_SCI, req.body.course5_SCI, req.body.course6_SCI, req.body.course7_SCI, req.body.course8_SCI];
					var courseENGR = [req.body.course1_ENGR, req.body.course2_ENGR, req.body.course3_ENGR, req.body.course4_ENGR, req.body.course5_ENGR, req.body.course6_ENGR, req.body.course7_ENGR, req.body.course8_ENGR];
					var courseAHSE = [req.body.course1_AHSE, req.body.course2_AHSE, req.body.course3_AHSE, req.body.course4_AHSE, req.body.course5_AHSE, req.body.course6_AHSE, req.body.course7_AHSE, req.body.course8_AHSE];

					// combine each individual course entry into array of info 
					for(var i=0; i<courseNames.length; i++){
						arr.push({
							courseName: courseNames[i], 
							MTH: courseMTH[i], 
							SCI: courseSCI[i], 
							ENGR: courseENGR[i], 
							AHSE: courseAHSE[i]
						});
					}
					// upon successful completion of course list creation, call callback
					callback(null);
				}, 
				populating_course_list: ['ingesting_user_data', function(callback){
					// create a list of course objects 
					async.map(arr, function(item, next){
						var courseType; 
						var courseCredits;
						if(item.MTH != 0){
							courseType = 'MTH';
							courseCredits = item.MTH;
						}else{
							if(item.SCI != 0){
								courseType = 'SCI';
								courseCredits = item.SCI;
							}else{
								if(item.ENGR != 0){
									courseType = 'ENGR';
									courseCredits = item.ENGR;
								}else{
									if(item.AHSE != 0){
										courseType = 'AHSE';
										courseCredits = item.AHSE;
									}else{
										courseType = '';
										courseCredits = '';
									}
								}
							}
						}	
						// for right now, all non-pertinent attributes are just empty strings 
						var newCourse = new Course({section: '', name: item.courseName, credit: courseCredits, grade: '', type: courseType, id: ''});
						newCourse.save(function(err){
							if(err)
								console.log("Couldn't save the new course: ", err);
							courseList.push(newCourse);
							next(null);
						});
					}, function(err, results){
						callback(null, results);
					});
				}], 
				create_planOfStudy: ['populating_course_list', function(callback, results){
					newPlanOfStudy = new PlanOfStudy({
						owner: req.session.user._id,
						name: req.body.form_name, 
						student_name: req.body.student_name, 
						adviser: req.body.adviser_name, 
						grad_year: req.body.graduation_year, 
						concentration_declaration: req.body.declaration_title, 
						courses: courseList, 
						MTH_credits: req.body.total_MTH, 
						SCI_credits: req.body.total_SCI, 
						ENGR_credits: req.body.total_ENGR,
						AHSE_orOther_credits: req.body.total_AHSE, 
						additional_electives_MTH: req.body.additional_MTH,  
						additional_electives_SCI: req.body.additional_SCI, 
						additional_electives_ENGR: req.body.additional_ENGR, 
						additional_electives_AHSE: req.body.additional_AHSE, 
						overlap_toggle_allOlin: req.body.overlap_allOlin_toggle, 
						course_plan_story: req.body.course_plan_text, 
						chem_matsci_req: req.body.chem_matsci, 
						phys_req: req.body.phys, 
						design_depth_req: req.body.design_depth, 
						overlap_toggle_chemMatsciDesign: req.body.overlap_chemMatsci_toggle});

					newPlanOfStudy.save(function (err){
						if(err)
							console.log("Unable to create and save new plan of study: ", err);
						callback(null, 'done');
					});
				}], 
				update_userPlanList: ['create_planOfStudy', function(callback){
					var currPlanList = student.planOfStudy_forms; 
					currPlanList.push(newPlanOfStudy); 
					student.planOfStudy_forms = currPlanList; 
					student.save(function (err){
						if(err)
							console.log("Unable to update student's profile: ", err);
						callback(null);
					})
				}], 
			}, function (err, result){
				// final callback
				if(err)
					console.log("Error creating new plan of study: ", err);
				console.log("Successfully created new plan of study");
				res.redirect('/home');
			})
		}
	}); 
}


// delete all Plans of Study associated with a student
exports.delete_all_student = function(req, res){
	Student.findOne({username: req.session.user.username}).update({planOfStudy_forms: []}).exec(function (err){
		if(err)
			console.log("Could not remove student's plans of study: ", err);
		res.redirect('/home');
	});
}

// delete all forms in the database 
exports.delete_all = function(req, res){
  PlanOfStudy.remove().exec(function(err) { 
      console.log('Plan of Study collection emptied');
      res.redirect('/');
  });
}

// delete one specific Plan of Study
exports.delete_one = function(req, res){
	console.log("Made it into the delete call!!");
	PlanOfStudy.findOneAndRemove({_id: req.params.plan_ID}, function (err){
		if(err)
			console.log("Couldn't properly delete specified plan of study: ", err);
		res.redirect('/home');
	})
}

// list all Plans of Study associated with a student [DEBUG PURPOSES ONLY]
exports.enumerate_plans = function(req, res){
	Student.findOne({username: req.session.user.username}).populate('planOfStudy_forms').exec(function (err, student){
		for(var i=0; i< student.planOfStudy_forms.length; i++){
		}
	});
}

// BACKDOOR DISPLAY FORM: created when no internet access for sis login
exports.backdoorDisplay = function(req, res){
	res.render('planOfStudyForm', {title: "Engineering Plan of Study", name: 'Margaret-Ann Seger', advisor: 'John Geddes'});
}


exports.autoFillPlanInfo = function(req, res){
	data = {};
	PlanOfStudy.findOne({_id: req.params.planID}).populate('courses').exec(function(err, plan){
		if(plan.owner != req.session.user._id) {
			res.send("You do not have permission to view this plan of study.");
		} else {

			// general fields data population
			data['student_name'] = plan.student_name; 
			data['adviser_name'] = plan.adviser;
			data['graduation_year'] = plan.grad_year;
			data['declaration_title'] = plan.concentration_declaration;
			data['overlap_allOlin_toggle'] = plan.overlap_toggle_allOlin;
			data['course_plan_text'] = plan.course_plan_story;
			data['chem_matsci'] = plan.chem_matsci_req;
			data['phys'] = plan.phys_req;
			data['design_depth'] = plan.design_depth_req;
			data['overlap_chemMatsci_toggle'] = plan.overlap_toggle_chemMatsciDesign;
			data['form_name'] = plan.name; 

			// data population of course list
			var counter = 1; 
			for(var i=0; i<plan.courses.length; i++){
				var currCourse = plan.courses[i];

				if(currCourse.name != '' && currCourse.credit != null){
					data['course' + counter] = currCourse.name;

					// type of credit course qualifies for 
					var creditType = currCourse.type;
					data['course' + counter + '_' + creditType] = currCourse.credit; 
					counter++; 
				}
			}

			// totals for courses sub-form
			data['subtotal_MTH'] = plan.MTH_credits - plan.additional_electives_MTH - 8;  
			data['subtotal_SCI'] = plan.SCI_credits - plan.additional_electives_SCI - 14; 
			data['subtotal_ENGR'] = plan.ENGR_credits - plan.additional_electives_ENGR - 30; 
			data['subtotal_AHSE'] = plan.AHSE_orOther_credits - plan.additional_electives_AHSE; 
			
			data['allSchool_MTH'] = 8;
			data['allSchool_SCI'] = 14; 
			data['allSchool_ENGR'] = 30; 
			data['allSchool_AHSE'] = 0; 

			data['additional_MTH'] = plan.additional_electives_MTH; 
			data['additional_SCI'] = plan.additional_electives_SCI; 
			data['additional_ENGR'] = plan.additional_electives_ENGR; 
			data['additional_AHSE'] = plan.additional_electives_AHSE; 


			data['total_MTH'] = plan.MTH_credits; 
			data['total_SCI'] = plan.SCI_credits;
			data['total_ENGR'] = plan.ENGR_credits;
			data['total_AHSE'] = plan.AHSE_orOther_credits;

			// send data
			res.send(data);
		}
	})
}




