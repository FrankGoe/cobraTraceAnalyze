l_App = angular.module('TrApp');

l_App.controller('CtrTrace', function($scope, $sce, $timeout, $q, $http, TrAnalyze, TrStatistics, TrOptions, TrControllerType, TrFilterType, TrLineTypes, TrSeriesTypes) 
{      	
	// Variables
	$scope.TrOptions = TrOptions;
	$scope.TrControllerType = TrControllerType;		
	$scope.TrAnalyze = TrAnalyze;		
	$scope.TrFilterType = TrFilterType;	
	$scope.TrStatistics = TrStatistics;

	$scope.currentLineType = TrOptions.currentLineType;
	$scope.currentSeriesType = TrOptions.currentSeriesType;	
	$scope.currentFilter = TrOptions.currentFilter;							

	$scope.filterOptions = {dataSource: TrFilterType,  
							valueExpr: 'Id',
							displayExpr: 'Desc',
							bindingOptions: { value: "currentFilter.Id"} 
							};	

	$scope.lineTypeOptions = {dataSource: TrLineTypes,  
								bindingOptions: { value: "currentLineType.Id"} 
								};
	  
	$scope.seriesTypeOptions = {dataSource: TrSeriesTypes,  
								  bindingOptions: { value: "currentSeriesType.Id"} 
								};							


	$scope.traceLoading = true;
	$scope.loadPanelSettings = {closeOnOutsideClick: true,	width: 400, height: 200, bindingOptions: {visible: 'isLoadPanelVisible', message: 'loadingText'}};
	$scope.isLoadPanelVisible = false; 
	$scope.loadingText = "Bitte warten..."								
	
	// Events

	$scope.$watch('currentFilter.Id', ExecuteAnalyze); 
	$scope.$watch('currentSeriesType.Id', DoInitComponent); 
	$scope.$watch('TrAnalyze.TraceRows', DoInitComponent);
	$scope.$watch('TrOptions.FilterTime', ExecuteAnalyze); 			
	$scope.$watch('TrOptions.SelectedRow', DoInitComponent);
	$scope.$watch('TrOptions.VisibleController', DoInitComponent); 
	
	// Events	
	$scope.OnClickShowInput = DoShowInput;
	$scope.OnClickShowChart = DoClickShowChart;	
	$scope.OnCellClicked = DoCellClicked;
	$scope.OnFileNameChanged = DoFileNameChanged;
	$scope.OnClickResult = DoShowResult;	

	InitTab();
	InitChart();
	InitGrid();	
	InitForm();
	TrOptions.VisibleController = TrControllerType.Empty;
	
	function InitTab()
	{
		$scope.tabSettings = {items: [
			{ text: "Chart"},
			{ text: "Tabelle"},
			{ text: "Datensatz"}
			],
			bindingOptions: {
				selectedIndex: 'TrOptions.VisibleController'
			},
			width: 300,
			height: 20,
			selectedIndex: 0
		};
	};		
	
	function InitChart()
	{
		$scope.chartSettings = {title: "",		
		commonSeriesSettings: {argumentField: "TimeStampStrShort"},
		bindingOptions: {dataSource: "chartData", 
						"commonSeriesSettings.type": "currentLineType.Id",
						series: "currentSeries"
					   },		
		export: {enabled: true},	
		tooltip: {enabled: true,
				 customizeTooltip: OnShowTooltip
				 },															 						
		legend: {verticalAlignment: "bottom",
				 horizontalAlignment: "center",
				 itemTextPosition: "bottom"}
				 ,
		onInitialized: function (e) {
					 $scope.chartApi = e.component;    
				 },
	   onPointClick: DoChartClick
	   };	
	}

	// Methods
	function ExecuteAnalyze()
	{	
		if (TrAnalyze.FileName == "")
			return;

		TrAnalyze.TraceRows = [];
		$scope.isLoadPanelVisible = false;
		$scope.isLoadPanelVisible = true;
		$scope.loadingText ="Trace wird analysiert. Bitte warten...";

		// Execute Async
		$timeout(function() {$q.when(TrAnalyze.AnalyzeTrace()).then(DoAnalyzeFinished()); }, 50)
	}
	
	function DoAnalyzeFinished(p_Result) 
	{
		TrOptions.VisibleController = TrControllerType.Chart;	
		$scope.isLoadPanelVisible = false;		
		$scope.traceLoading = false;
		$scope.$apply();			
	};	
	
	function DoFileNameChanged(element)
	{
		$scope.traceLoading = true;
		$scope.isLoadPanelVisible = true;
		$scope.$apply();

		var l_Reader = new FileReader();

		l_Reader.onload = DoOnLoad;		

		if (element.files.length > 0)
		{
			TrAnalyze.FileName = element.files[0].name;
			$scope.loadingText ="Datei '" + TrAnalyze.FileName + "' wird geladen. Bitte warten...";
			$scope.$apply();

			$timeout(function() {l_Reader.readAsText(element.files[0]);}, 500)
			
		}
				
		function DoOnLoad() 
		{
			TrAnalyze.TraceFile = l_Reader.result;
			ExecuteAnalyze();
		}		
	}	

	function OnShowTooltip(args)
	{		
		return {
				html: "<div> Nummer: " + TrAnalyze.TraceRows[args.point.index].Id + '   ' +  args.seriesName  + ":" + args.valueText + "<br>" + 
				                         TrAnalyze.TraceRows[args.point.index].Sql.substring(0,200) + "</div>"	
		}
	}

	// Methods
	function DoChartClick(info) 
	{
		if (info != undefined)
		{
			if (info.target.index <= TrAnalyze.TraceRows.length)
				$scope.TrOptions.SelectedRow = TrAnalyze.TraceRows[info.target.index];	

			DoShowCellData();	
		}		
	}

	function DoInitComponent()
	{	
		if (TrOptions.VisibleController == TrControllerType.Chart)
		{
			if ($scope.currentSeriesType.Id  == TrSeriesTypes[0])
			$scope.currentSeries = [{ valueField: 'SqlTime' , name: "Laufzeit"}];
		
			else if  ($scope.currentSeriesType.Id  == TrSeriesTypes[1])
				$scope.currentSeries = [{ valueField: 'WaitingTime', name: "Wartezeit"}];
			else
				$scope.currentSeries = [{ valueField: 'SqlTime' , name: "Laufzeit"}, { valueField: 'WaitingTime', name: "'Wartezeit'" }];

			$scope.chartData = TrAnalyze.TraceRows;	
		}
						
		if (TrOptions.VisibleController == TrControllerType.Result)
		{
			$scope.gridData = TrAnalyze.TraceRows;			
		}	
		
		if (TrOptions.VisibleController == TrControllerType.CellData)
		{
			if (TrOptions.SelectedRow != null)
			{
				$scope.formData = TrOptions.SelectedRow;
				
				var l_Elem = document.getElementsByName("SqlText");
			
				if (l_Elem.length > 0)
				{
					l_Elem[0].innerHTML = TrOptions.SelectedRow.Sql; 
					hljs.highlightBlock(l_Elem[0]);
			
					clipboard.copy(TrOptions.SelectedRow.Sql);
				}	
			}
		}
	}		

	function InitGrid()
	{	
		$scope.gridData = [];
		
		$scope.gridSettings = {bindingOptions: {dataSource: "gridData"},	
						      filterRow: { visible: true },
							  searchPanel: {visible: true},
							  groupPanel: {visible: true},
							  allowColumnResizing: true,
							  columnChooser: {enabled: true},
							  columnFixing: {enabled: true},
							  columnAutoWidth: true,
							  selection: {mode: "single"},
							  columns: [{caption: "Nummer",
										 dataField: "Id",
										 dataType: "number",
										 alignment: "middle"
										}, 
										
										{caption: "Zeitstempel",
										 dataField: "TimeStampStr",
										 dataType: "string",
										 alignment: "middle"										 
										}, 
										
										{caption: "Laufzeit",
										dataField: "SqlTime",
										dataType: "number",
										alignment: "middle"
										}, 
										
										{caption: "Wartezeit",
										dataField: "WaitingTime",
										dataType: "number",										
										alignment: "middle"
										},

										{caption: "Typ",
										dataField: "Typ",
										alignment: "middle",
										dataType: "string"
										},

										{caption: "SQL Statement",
										dataField: "Sql",
										dataType: "string",
										alignment: "left"
										}
									],
									summary: {
										totalItems: [
											{column: 'Id',
											summaryType: 'count'
											},

											{column: 'SqlTime',
											summaryType: 'sum'
											},

											{column: 'SqlTime',
											summaryType: 'avg'
											},
											
											{column: 'WaitingTime',
											summaryType: 'sum'
											},

											{column: 'WaitingTime',
											summaryType: 'avg'
											}
										]
									},
									onInitialized: function (e) {$scope.gridApi = e.component;},
									onCellClick: DoCellClicked,
									onSelectionChanged: DoGridSelectionChanged
								};
	}
	function DoGridSelectionChanged(selectedItems)
	{
		$scope.TrOptions.SelectedRow = selectedItems.selectedRowsData[0];
	}

	function DoCellClicked(p_Cell)
	{
		if (p_Cell.columnIndex == 5)
		{
			$scope.TrOptions.SelectedRow = TrAnalyze.TraceRows[p_Cell.rowIndex];		
			DoShowCellData();	
		}
	}
	
	function DoShowInput() 
	{
		$scope.TrOptions.VisibleController = TrControllerType.Input;
	}

	function DoClickShowChart() 
	{
		$scope.TrOptions.VisibleController = TrControllerType.CellData;
	}	

	function DoShowCellData()
	{
		$scope.TrOptions.VisibleController = TrControllerType.CellData;
	}		

	function clearSelection()
	{
		var l_Selection = window.getSelection();		
		l_Selection.removeAllRanges();	
	}
		  

    function DoShowResult() 
	{
		clearSelection();
		TrOptions.SelectedRow = null;

		$scope.TrOptions.VisibleController = TrControllerType.Result;			
	};

	function InitForm()
	{
		$scope.formData = TrAnalyze.CreateEmptyItem();

		$scope.formSettings =  {
					colCount: 1,					
					bindingOptions: {
						'formData': 'formData'                
					},

					items: [
							{dataField: "Id",
							  editorOptions: {disabled: true},
							  label: {text: "Nummer"}
					   		}, 

							{dataField: "TimeStampStr",
							 editorOptions: {disabled: true},
							 label: {text: "Zeitstempel"}
							}, 
							
							{dataField: "SqlTimeStr",
							editorOptions: {disabled: true},
							label: {text: "Laufzeit"}
							}, 				
							
							{dataField: "WaitingTimeStr",
							editorOptions: {disabled: true},
							label: {text: "Wartezeit"}
							}, 					
							
							{dataField: "Typ",
							editorOptions: {disabled: true},
							label: {text: "Typ"}							
						    }
						]					
				};			
	}	
});


