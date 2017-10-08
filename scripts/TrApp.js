l_App = angular.module('TrApp', ['ui.grid', 'ui.grid.edit', 'ui.grid.cellNav','ui.grid.resizeColumns', 'ui.grid.grouping','ui.grid.exporter', 'ui.grid.autoResize', 'chart.js']);

l_App.constant('TrVisibleType', {Input: 0, Status: 1, Chart: 2, Result: 3} );
l_App.constant('TrFilterType', {All: 0, SqlTime: 1, WaitingTime: 2});

l_App.value('TrOptions', {SelectedFilter: 1, SelectedIndex: -1, VisibleController: 0, SqlTime: 0.1,  WaitingTime: 0.1});

l_App.value('TrStatistics', { Filtered: {Count : 0, SumTraceTime : 0, AvgTraceTime : 0, SumWaitingTime : 0},
							  Total: {Count : 0, SumTraceTime : 0, AvtTraceTime : 0, SumWaitingTime : 0, SumTimestampTime : 0}						
						    });

l_App.value('TrGridOptions', { data: 'TraceRows',	
							rowHeight: 30,		
						   enableFiltering: true,
						   enableFullRowSelection: false,
			 			   enableCellEditOnFocus: true,
			 			   treeRowHeaderAlwaysVisible: false,
			 			   showColumnFooter: false,
			 			   exporterMenuCsv: true,
			 			   enableGridMenu: true,
			 			   exporterMenuPdf: false,
						   exporterCsvColumnSeparator: ';',
			 			   exporterCsvFilename: 'Trace.csv',
						   columnDefs: [{ field: 'Id', displayName: 'Nummer', width: 150, type: 'number', enableCellEdit: true, enableColumnResizing: false, enableGrouping: false},
								 		{ field: 'TimeStampStr', displayName: 'Uhrzeit', width: 200, enableCellEdit: true, enableColumnResizing: false, enableSorting: false, enableGrouping: false},
								 		{ field: 'SqlTime', displayName: 'Laufzeit', width: 150, type: 'number', enableCellEdit: true, enableColumnResizing: false},                                 
								 		{ field: 'WaitingTime', displayName: 'Wartezeit', width: 150, type: 'number', enableCellEdit: true, enableColumnResizing: false},
                                 		{ field: 'Typ', displayName: 'Typ', width: 120, nableCellEdit: true},                                 
                                 		{ field: 'Sql', displayName: 'Statement', width: 1000, enableCellEdit: true  }]	
						});
