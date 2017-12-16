l_App = angular.module('TrApp');

l_App.controller('CtrTrace', function($scope, $timeout, $q, $http, TrAnalyze, TrStatistics, TrOptions, TrControllerType, TrFilterType, TrLineTypes, TrSeriesTypes) 
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

	$scope.cboFilterOptions = {dataSource: TrFilterType,  
							valueExpr: 'Id',
							displayExpr: 'Desc',
							bindingOptions: { value: "currentFilter.Id"} 
							};	

	$scope.cboLineTypeOptions = {dataSource: TrLineTypes,  
								bindingOptions: { value: "currentLineType.Id"} 
								};
	  
	$scope.cboSeriesTypeOptions = {dataSource: TrSeriesTypes,  
								  bindingOptions: { value: "currentSeriesType.Id"} 
								};							


	$scope.traceLoading = true;
	$scope.loadPanelSettings = {closeOnOutsideClick: true,	width: 400, height: 200, bindingOptions: {visible: 'isLoadPanelVisible', message: 'loadingText'}};
	$scope.isLoadPanelVisible = false; 
	$scope.loadingText = "Bitte warten..."		
	TrOptions.VisibleController = TrControllerType.Empty;
		
	// Events

	$scope.$watch('currentFilter.Id', ExecuteAnalyze); 
	$scope.$watch('currentSeriesType.Id', DoInitComponent); 
	$scope.$watch('TrAnalyze.TraceRows', DoInitComponent);
	$scope.$watch('TrOptions.SelectedRow', DoInitComponent);
	$scope.$watch('TrOptions.VisibleController', DoInitComponent); 
	$scope.$watch('TrOptions.FilterTime', DoFilterChanged); 			
	$scope.onFileNameChanged = DoFileNameChanged;

	InitTraceOptions();
	InitTab();
	InitChart();
	InitGrid();	
	InitForm();
	
	// Methods
	function DoFilterChanged()
	{	
		if (TrAnalyze.FileName == "")
			return;
	
		// Vorherige Verzögere Ausführung abbrechen
		if ($scope.PrevDebounce !== undefined)		
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
	
	function DoFileNameChanged(p_Element)
	{
		$scope.traceLoading = true;
		$scope.isLoadPanelVisible = true;
		$scope.$apply();

		var l_Reader = new FileReader();

		l_Reader.onload = DoOnLoad;		

		if (p_Element.files.length > 0)
		{
			TrAnalyze.FileName = p_Element.files[0].name;
			$scope.loadingText ="Datei '" + TrAnalyze.FileName + "' wird geladen. Bitte warten...";
			$scope.$apply();

			$timeout(function() {l_Reader.readAsText(p_Element.files[0]);}, 500)
			
		}
				
		function DoOnLoad() 
		{
			TrAnalyze.TraceFile = l_Reader.result;
			ExecuteAnalyze();
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

		function DoSelectGridRow(p_GridApi, p_Row)
		{
			// prüfen ob Selektion vorhanden ist
			if (p_Row == null)
				return;

			// prüfen ob zeile bereits selektiert wurde
			var l_Rows = p_GridApi.getSelectedRowsData();
			if (l_Rows.length > 0 && l_Rows[0] == p_Row) 
				return;

			// Sortierung entfernen sonst klappt das Seitenausrechnen in dieser form nicht
			p_GridApi.clearSorting();				

			var l_PageSize = p_GridApi.pageSize();
			var l_PageIndex = Math.floor(p_Row.Id / l_PageSize);
			var l_Mod = p_Row.Id % l_PageSize;
	
			if (l_Mod == 0)
				l_PageIndex = l_PageIndex -1
						
			// Zeile selektieren
			p_GridApi.selectRows(p_Row);			  
	
			// korrekte Seite auswählen
			if (l_PageIndex !== p_GridApi.pageIndex()) 
				p_GridApi.pageIndex(l_PageIndex);
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
							  paging: {pageSize: 16},
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
															
	}
		
	function InitForm()
	{
		$scope.formData = TrAnalyze.CreateEmptyItem();

		$scope.frmTraceItem =  {
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
	}

	function InitTraceOptions()
	{
		$scope.traceServiceActive = false;

		$scope.cboTraceFilesOptions = {
			bindingOptions: {dataSource: "traceFileItems"},
			onValueChanged: DoSelectBoxChanged,
			itemTemplate: function (p_TraceName) 
			{
				var l_TraceFile = _.filter($scope.traceFiles.items, { 'name': p_TraceName });
				return "<div class='custom-item' title='" + p_TraceName + "'>" + p_TraceName + " | " + l_TraceFile[0].lastModified + " | " + l_TraceFile[0].totalSpaceMb + "</div>";
			}								
		};

		$scope.btnTraceOptions = {text: String.fromCharCode(9881), 
								onClick: doChangeTraceFolder};

		$scope.popPathOptions = {title: 'Einstellungen', 
								bindingOptions: {visible: 'folderPopupVisible'},
								height: "250px",
								width: "800px"
								};

		$scope.txtPathOptions = { bindingOptions: { value: "tracePath" },
								width: "500px"
								};

		$scope.txtDaysDeleteOffsetOptions = { bindingOptions: { value: "daysDeleteOffset" },
									width: "50px"};	
				
		$scope.btnConfirmOptions = {text: "Einstellungen übernehmen", 
									onClick: doChangeTraceOptions};

		$scope.chkDeleteFilesOptions = { bindingOptions: { value: "deleteTrace" },
										width: "50px"
										};

		$scope.btnReloadFilesOptions = {text: String.fromCharCode(10226),
									onClick: loadTraceFiles
									};								  
				
		loadTraceFiles();

		function loadTraceFiles()
		{
			$http.get("http://localhost:8080/traceFiles/").then(TraceFilesGetRequest, TraceFileGetRequestFailed);
			
			function TraceFilesGetRequest(p_Response)
			{
				$scope.traceServiceActive = true;		  
				$scope.traceFiles = p_Response.data;	  
				$scope.tracePath = p_Response.data.path;
				$scope.daysDeleteOffset = 8;
				$scope.deleteTrace = false;		  
				$scope.folderPopupVisible = false;
	
				$scope.traceFileItems = _.map(p_Response.data.items, function (p_TraceFile) 				
				{
					return p_TraceFile.name;
				});			
			}

			function TraceFileGetRequestFailed(p_Response)
			{
				$scope.traceServiceActive = false;
				$scope.traceFiles  = undefined;
				$scope.selectBoxOptions = undefined;	  
			} 			
		}

		function doChangeTraceOptions()
		{
			$scope.folderPopupVisible = false;

			if ($scope.tracePath != $scope.traceFiles.path)
				changeTracePath();

			if ($scope.deleteTrace)
			{				
				var l_Url = "http://localhost:8080/deleteTraceFiles/";      
				$http.post(l_Url, $scope.daysDeleteOffset).then(pathChangedRequest);				
			}

			function changeTracePath()
			{
				//var l_Data = {newPath : $scope.tracePath};	
				//$http.post(l_Url, JSON.stringify(l_Data)); //.then(UserResponse);      

				var l_Url = "http://localhost:8080/newTracePath/";      
				$http.post(l_Url, $scope.tracePath).then(pathChangedRequest);
			}

			function pathChangedRequest(p_Response)
			{
				$scope.traceFiles = p_Response.data;	  
				$scope.tracePath = p_Response.data.path;
	  
				$scope.traceFileItems = _.map(p_Response.data.items, function (p_TraceFile) 
				{
				  return p_TraceFile.name;
				});	  
			}
		}

		function doChangeTraceFolder()
		{
			$scope.folderPopupVisible = true;
		}

		function DoSelectBoxChanged(p_Element)
		{
			$scope.traceLoading = true;
			$scope.isLoadPanelVisible = true;
		
			$http.get("http://localhost:8080/traceFile/" + p_Element.value).then(TraceFileRequest, TraceFileRequestFailed);
	
			function TraceFileRequest(p_Response)
			{
				TrAnalyze.FileName = p_Element.value;
				TrAnalyze.TraceFile = p_Response.data;
				
				ExecuteAnalyze();		
			}
	
			function TraceFileRequestFailed(p_Response)
			{
				alert("URL nicht erreichtbar.  " + p_Response.config.url)
			}		
		}		
	}
	
});


