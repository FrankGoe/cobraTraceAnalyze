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
	$scope.$watch('TrOptions.SelectedRow', DoInitComponent);
	$scope.$watch('TrOptions.VisibleController', DoInitComponent); 

	$scope.$watch('TrOptions.FilterTime', DoFilterChanged); 			
	 
	// Events	
	$scope.OnFileNameChanged = DoFileNameChanged;

	InitTab();
	InitChart();
	InitGrid();	
	InitForm();

	TrOptions.VisibleController = TrControllerType.Empty;
	

	// Methods
	function DoFilterChanged()
	{	
		if (TrAnalyze.FileName == "")
			return;
	
		// Vorherige Verzögere Ausführung abbrechen
		if (typeof $scope.PrevDebounce !== "undefined")		
			$scope.PrevDebounce.cancel();

		// Filter Changed verzögert ausführen
		var l_Debounce = _.debounce(DoExecuteFilterChanged, 1000,  {'leading': false, 'trailing': true })	
		$scope.PrevDebounce = l_Debounce;
		l_Debounce();

		function DoExecuteFilterChanged()
		{			
			$scope.loadingText ="Trace wird analysiert. Bitte warten...";			
			$scope.isLoadPanelVisible = true;
			$scope.$apply();
	
			ExecuteAnalyze();
		}
	}

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
		var l_TraceItem =  TrAnalyze.TraceRows[args.point.tag -1];
		var l_SeriesValue = 0;
		
		if (args.seriesName === "Laufzeit")
			l_SeriesValue = l_TraceItem.SqlTime
		else
			l_SeriesValue = l_TraceItem.WaitingTime;

		return {
				html: "<div> Nummer: " + l_TraceItem.Id + '  ' +  args.seriesName  + ":  " +l_SeriesValue + "<br>" +  l_TraceItem.Sql.substring(0,200) + "</div>"	
		}
	}

	// Methods
	function DoChartClick(info) 
	{
		if (info != undefined)
		{
			if (info.target.index <= TrAnalyze.TraceRows.length)
			{
				$scope.TrOptions.SelectedRow = TrAnalyze.TraceRows[info.target.index];	
				info.target.hideTooltip();

				$scope.TrOptions.VisibleController = TrControllerType.Result;				
			}
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
				$scope.currentSeries = [{ valueField: 'SqlTime' , name: "Laufzeit"}, { valueField: 'WaitingTime', name: "Wartezeit" }];

			$scope.chartData = TrAnalyze.TraceRows;	
		}
						
		if (TrOptions.VisibleController == TrControllerType.Result)
		{		
			$scope.gridData = TrAnalyze.TraceRows;			
			DoSelectGridRow($scope.gridApi, $scope.TrOptions.SelectedRow);
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

	function DoSelectGridRow(p_GridApi, p_Row)
	{
		if (p_Row == null)
			return;

		p_GridApi.beginUpdate();

		p_GridApi.selectRows(p_Row);			

		var l_PageSize = p_GridApi.pageSize();
		var l_PageIndex = Math.floor(p_Row.Id / l_PageSize);
  
		if (l_PageIndex !== p_GridApi.pageIndex()) 
		{		  
			p_GridApi.pageIndex(l_PageIndex);
		}		

		DoScrollToRow(p_GridApi, p_Row)		
		p_GridApi.endUpdate();
	}

	function DoScrollToRow(p_GridApi, p_Row)
	{
		  var scrollable = p_GridApi.getScrollable();      
		  var selectedRowElements = p_GridApi.getCellElement(p_Row.Id, 0);

		  if (selectedRowElements == undefined)
			  return;
			  
		  setTimeout(function(){scrollable.scrollToElement(selectedRowElements.parent()); }) 
	}

	function DoGridSelectionChanged(selectedItems)
	{
		$scope.TrOptions.SelectedRow = selectedItems.selectedRowsData[0];
	}

	function DoCellClicked(p_Cell)
	{
		var component = p_Cell.component;
		
		function initialClick() 
		{
			component.clickCount = 1;
			component.clickKey = p_Cell.key;
			component.clickDate = new Date();
		}

		function doubleClick() 
		{
			component.clickCount = 0;
			component.clickKey = 0;
			component.clickDate = null;

			$scope.TrOptions.VisibleController = TrControllerType.CellData;
		}

		if ((!component.clickCount) || (component.clickCount != 1) || (component.clickKey != p_Cell.key) ) 
		{                
			initialClick();
		}
		
		else if (component.clickKey == p_Cell.key) 
		{
			if (((new Date()) - component.clickDate) <= 300)
				doubleClick();                                
			else
				initialClick();                
		}		
	}

	function clearSelection()
	{
		var l_Selection = window.getSelection();		
		l_Selection.removeAllRanges();	
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
								commonSeriesSettings: {argumentField: "ChartArgument", point: { size: 7},
													  tagField : "Id"
							                          },
								bindingOptions: {dataSource: "chartData", 
												"commonSeriesSettings.type": "currentLineType.Id",
												series: "currentSeries"
											},		
								argumentAxis: {
									label: {
										format: "HH:mm:ss" //yyyy-MMdd HH:mm:ss
									}
								},
								useAggregation: false,
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
});


