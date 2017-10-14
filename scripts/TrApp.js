l_App = angular.module('TrApp', ['ui.grid', 'ui.grid.edit', 'ui.grid.cellNav','ui.grid.resizeColumns', 'ui.grid.grouping','ui.grid.exporter', 'ui.grid.autoResize', 'chart.js']);

l_App.constant('TrControllerType', {Input: 0, Status: 1, Chart: 2, Result: 3, CellData: 4} );
l_App.constant('TrFilterType', {All: 0, SqlTime: 1, WaitingTime: 2});

l_App.value('TrOptions', {SelectedFilter: 1, SelectedRow: {}, SelectedCell: {Text: "", Name: ""}, VisibleController: 0, SqlTime: 0.1,  WaitingTime: 0.1});

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
			 			   exporterCsvFilename: 'Trace.csv'						   	
						});
