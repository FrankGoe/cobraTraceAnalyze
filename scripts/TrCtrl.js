l_App = angular.module('TrApp');

l_App.controller('CtrTrInput', function($scope, $timeout, $q, $http, TrAnalyze, TrOptions, TrVisibleType, TrFilterType) 
{      	
	// Variables
	$scope.TrOptions = TrOptions;
	$scope.TrVisibleType = TrVisibleType;		
	$scope.TrFilterType = TrFilterType;	
	$scope.Standort = {isp : "", city : "", country : "", query : ""};	

	// Events
	$scope.OnClickAnalzyeTrace = DoClickAnalyzeTrace;
	$scope.OnFileNameChanged = DoFileNameChanged;
	$scope.TraceLoading = true;
	
//	InitLocation();

	// Methods
	function InitLocation()
	{
		$http({
			method : "JSONP",
			url : "http://ip-api.com/json/?callback=JSON_CALLBACK",
			
		}).then(function mySuccess(response) {
					$scope.Standort = angular.fromJson(response.data);
				}, 
		       function myError(response) {
					alert(response.statusText);
			    }
		);
	}
	
	function DoClickAnalyzeTrace()
	{
		if (TrAnalyze.TraceFile == "")
			alert('Bitte wählen Sie zuerst eine Tracedatei aus.')
			
		else
		{								
			$scope.TrOptions.VisibleController = TrVisibleType.Status;
		}
	}; 	
	
	function DoFileNameChanged(element)
	{
		$scope.TraceLoading = true;
		$scope.$apply();
		
		var l_Reader = new FileReader();

		l_Reader.onload = DoOnLoad;		

		if (element.files.length > 0)
			l_Reader.readAsText(element.files[0]);
		
		function DoOnLoad() 
		{
			TrAnalyze.TraceFile = l_Reader.result;

			$scope.TraceLoading = false;
			$scope.$apply();
		}		
	}	
});

l_App.controller('CtrTrStatus', function($scope, $sce, $q, $timeout, TrOptions, TrVisibleType, TrAnalyze, TrStatistics, TrGridOptions) 
{
	// Variables
	$scope.TrVisibleType = TrVisibleType;
	$scope.TrOptions = TrOptions;
	
	// Events
	$scope.$watch('TrOptions.VisibleController', DoShowStatus); 
		
	// Methods
	function ExecuteAnalyze()
	{	
		// Execute Async
		$q.when(TrAnalyze.AnalyzeTrace()).then(DoAnalyzeFinished()); 			
	}
	
	function DoShowStatus()
	{
		if (TrOptions.VisibleController != TrVisibleType.Status)
		 return;

		$scope.StatusText = $sce.trustAsHtml('Trace wird analysiert. Bitte warten...');
		
		// kurz warten und Analyze durchführen
		$timeout(ExecuteAnalyze, 50); 
	}
	
	function DoAnalyzeFinished(p_Result) 
	{
		// Statustext
		$scope.StatusText = $sce.trustAsHtml("Ergebnismenge mit " + TrStatistics.Filtered.Count + " SQL-Statements wird geladen. Bitte warten...");

		if (TrAnalyze.HasTimestamps)
		{
			TrGridOptions.columnDefs[1].visible = true;
			TrGridOptions.columnDefs[3].visible = true;		
		}
		else
		{
			TrGridOptions.columnDefs[1].visible = false;
			TrGridOptions.columnDefs[3].visible = false;				
		}
		
		// kurz warten und Trace ausblenden
		$timeout(HideStatusCtr, 50);		
	};
	
	function HideStatusCtr()
	{
		$scope.TrOptions.VisibleController = TrVisibleType.Chart;
	}
});

l_App.controller('CtrTrChart', function($scope, $sce, TrOptions, TrVisibleType, TrFilterType, TrAnalyze, TrStatistics) 
{
	// Variables
	$scope.TrVisibleType = TrVisibleType;
	$scope.TrOptions = TrOptions;
	$scope.TrAnalyze = TrAnalyze;	
	$scope.TrFilterType = TrFilterType;		
	$scope.ChartType = 'SqlTime';	
	$scope.ChartOptions = {legend: {display: true},
						   tooltips: {enabled: true, 
				                      callbacks: {label: function(tooltipItem, data) {
													var label = data.labels[tooltipItem.index];													
												  	var datasetLabel = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
													return 'Nummer: ' + TrAnalyze.TraceRows[tooltipItem.index].Id + ' Zeit: ' + datasetLabel +  ' ' +  TrAnalyze.TraceRows[tooltipItem.index].Sql.substring(0, 110);
													}
												  }
									 },
							scales: {
										xAxes: [
										  {
											gridLines: {display: false}
										  }
										]
									  }	
						};

	// Events
	$scope.OnClickShowInput = DoShowInput;
	$scope.OnClickResult = DoShowResult;	
	$scope.OnShowChart = DoShowChart;	
	$scope.OnChartClick = DoChartClick;
	
	$scope.$watch('TrOptions.VisibleController', DoShowChart); 
	
	// Methods
	function DoChartClick(points, evt) 
	{
		if (points != undefined && points.length > 0)
		{
			DoShowResult();
			$scope.TrOptions.SelectedIndex = points[0]._index;
			$scope.$apply();				
		}		
	}

    function DoShowInput() 
	{
		$scope.TrOptions.VisibleController = TrVisibleType.Input;			
	};

    function DoShowResult() 
	{
		$scope.TrOptions.VisibleController = TrVisibleType.Result;			
	};
	
	function DoShowChart()
	{	
		if (TrOptions.VisibleController != TrVisibleType.Chart)
			return;
		
		$scope.labels = _.map(TrAnalyze.TraceRows, 'TimeStampStrShort');

		if (($scope.ChartType == 'SqlTime' && TrOptions.SelectedFilter == TrFilterType.All) || TrOptions.SelectedFilter == TrFilterType.SqlTime)
		{
			$scope.series = ['Laufzeit'];
			$scope.data = [_.map(TrAnalyze.TraceRows, 'SqlTime')];
		}
		
		else if  (($scope.ChartType == 'WaitingTime' && TrOptions.SelectedFilter == TrFilterType.All) || TrOptions.SelectedFilter == TrFilterType.WaitingTime)
		{
			$scope.series = ['Wartezeit'];
			$scope.data = [_.map(TrAnalyze.TraceRows, 'WaitingTime')];
		}

		else
		{
			$scope.series = ['Laufzeit', 'Wartezeit'];
			$scope.data = [_.map(TrAnalyze.TraceRows, 'SqlTime'), _.map(TrAnalyze.TraceRows, 'WaitingTime')];
			
		}
	}	
});

l_App.controller('CtrTrResult', function($scope, $sce, uiGridConstants, TrOptions, TrVisibleType, TrAnalyze, TrStatistics, TrGridOptions, TrFilterType) 
{
	// Variables
	$scope.TrStatistics = TrStatistics;
	$scope.TrVisibleType = TrVisibleType;
	$scope.TrFilterType = TrFilterType;	
	$scope.TrOptions = TrOptions;	
	$scope.TrAnalyze = TrAnalyze;
	
	$scope.TraceRows = [];

	InitGrid();

	// Events
	$scope.OnClickShowInput = DoShowInput;
	$scope.OnClickShowChart = DoClickShowChart;	
	$scope.OnGetTableStyle = DoGetTableStyle; 

	$scope.$watch('TrAnalyze.TraceRows', DoTraceResultChanged);
	$scope.$watch('TrOptions.SelectedIndex', DoSelectedIndexChanged);
	
	// Methods	
	function InitGrid()
	{
		$scope.GridOptions = TrGridOptions;
		$scope.GridOptions.onRegisterApi = DoRegisterGridApi;	
		$scope.GridOptions.columnDefs[2].cellTooltip = DoGetCellTooltipSqlTime;
		$scope.GridOptions.columnDefs[3].cellTooltip = DoGetCellTooltipWaitingTime;	
	}
	
	function DoGetCellTooltipSqlTime(p_Row, p_Col ) 
	{
		return p_Row.entity.SqlTimeStr;
	}

	function DoGetCellTooltipWaitingTime(p_Row, p_Col ) 
	{
		return p_Row.entity.WaitingTimeStr;	
	}

	function DoGetTableStyle() 
	{
		var l_RowHeight = 30; // your row height
		var l_HeaderHeight = 60; // your header height
		
		var l_DisplayRows = Math.min(22, $scope.gridApi.core.getVisibleRows($scope.gridApi.grid).length);
				
		return {	
		   height: ((l_DisplayRows * l_RowHeight) + l_HeaderHeight) + "px"
		};
	 };	

	function DoRegisterGridApi(gridApi)
	{
		$scope.gridApi = gridApi;			
	};
		
	function DoSelectedIndexChanged()
	{
		if ($scope.TrOptions.SelectedIndex != -1 && TrAnalyze.TraceRows.length >= $scope.TrOptions.SelectedIndex)
		{
			// uiGridConstants.filter
			//1.  STARTS_WITH
			//2.  ENDS_WITH
			//3.  CONTAINS 
			//4.  EXACT
			//5.  NOT_EQUAL
			//6.  GREATER_THAN
			//7.  GREATER_THAN_OR_EQUAL
			//8.  LESS_THAN
			//9.  LESS_THAN_OR_EQUAL

			$scope.gridApi.grid.columns[1].filters[0] = {
				condition: uiGridConstants.filter.EXACT,
				term: TrAnalyze.TraceRows[$scope.TrOptions.SelectedIndex].Id
			  };			
		}
	}

	function DoTraceResultChanged()
	{
		$scope.gridApi.grid.columns[1].filters[0] = {};	
		$scope.TraceRows = TrAnalyze.TraceRows;
	}	

	function DoShowInput() 
	{
		$scope.TrOptions.VisibleController = TrVisibleType.Input;
	};

	function DoClickShowChart() 
	{
		$scope.TrOptions.VisibleController = TrVisibleType.Chart;
	};	
});



