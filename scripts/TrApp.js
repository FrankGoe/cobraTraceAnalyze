l_App = angular.module('TrApp', ['ui.grid', 'ui.grid.edit', 'ui.grid.cellNav','ui.grid.resizeColumns', 'ui.grid.grouping','ui.grid.exporter', 'chart.js']);

l_App.value('TrVisibility', {ShowInput: true, ShowStatus: false, ShowResult: false, ShowChart: false});

l_App.value('TrOptions', {SQlTime: {On: true, Time : 0.1},	
						 WaitingTime: {On: true, Time : 0.1},
						 SelectedIndex: -1
						});

l_App.value('TrStatistics', { Filtered: {Count : 0, SumTraceTime : 0, AvgTraceTime : 0, SumWaitingTime : 0},
							  Total: {Count : 0, SumTraceTime : 0, AvtTraceTime : 0, SumWaitingTime : 0, SumTimestampTime : 0}						
						    });

l_App.value('TrGridOptions', { data: 'TraceRows',			
						   enableFiltering: true,
			 			   enableCellEditOnFocus: true,
			 			   treeRowHeaderAlwaysVisible: false,
			 			   showColumnFooter: false,
			 			   exporterMenuCsv: true,
			 			   enableGridMenu: true,
			 			   exporterMenuPdf: false,
						   exporterCsvColumnSeparator: ';',
			 			   exporterCsvFilename: 'Trace.csv',
						   columnDefs: [{ field: 'Id', displayName: 'Nummer', width: 150, type: 'number', enableCellEdit: false, enableColumnResizing: false, enableGrouping: false},
                                 { field: 'TimeStampStr', displayName: 'Uhrzeit', width: 200, enableCellEdit: false, enableColumnResizing: false, enableSorting: false, enableGrouping: false},
                                 { field: 'SqlTime', displayName: 'Laufzeit', width: 150, type: 'number', enableCellEdit: false, enableColumnResizing: false},                                 
                                 { field: 'WaitingTime', displayName: 'Wartezeit', width: 150, type: 'number', enableCellEdit: false, enableColumnResizing: false},
                                 { field: 'Typ', displayName: 'Typ', width: 120, enableCellEdit: false},                                 
                                 { field: 'Sql', displayName: 'Statement', width: 1000, enableCellEditOnFocus: true  }]	
						});
