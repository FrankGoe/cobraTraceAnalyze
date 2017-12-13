l_App = angular.module('TrApp', ['dx']);

l_App.constant('TrControllerType', {Chart: 0, Result: 1, CellData: 2, Empty: 3} );
l_App.constant('TrFilterType', [{Id: "All", Desc: "Keine Einschränkung"}, {Id: "SqlTime", Desc: "Laufzeit"}, {Id: "WaitingTime", Desc: "Wartezeit"}]);
l_App.constant('TrLineTypes', ["line", "spline", "stepline"]);
l_App.constant('TrSeriesTypes', ["Laufzeit", "Wartezeit", "Beide"]);

l_App.value('TrOptions', {currentFilter: {Id: "SqlTime"}, 
						  currentLineType: {Id: "line"},
						  currentSeriesType: {Id: "Laufzeit"},
							SelectedRow: null, 
							VisibleController: 0, 
							FilterTime: 0.1
						});

l_App.value('TrStatistics', { Filtered: {Count : 0, SumTraceTime : 0, AvgTraceTime : 0, SumWaitingTime : 0},
							  Total: {Count : 0, SumTraceTime : 0, AvtTraceTime : 0, SumWaitingTime : 0, SumTimestampTime : 0}						
						    });
