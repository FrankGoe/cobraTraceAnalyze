l_App = angular.module('TrApp');

l_App.controller('CtrTrInput', function($scope, $timeout, $q, $http, TrVisibility, TrAnalyze, TrOptions) 
{      	
	// Variables
	$scope.TrVisibility = TrVisibility;		
	$scope.TrOptions = TrOptions;
	$scope.Standort = {isp : "", city : "", country : "", query : ""};		

	// Events
	$scope.OnClickAnalzyeTrace = DoClickAnalyzeTrace;
	$scope.OnFileNameChanged = DoFileNameChanged;
	$scope.OnClickAnalyzeWaitingTime = DoClickAnalyzeWaitingTime;
	$scope.OnClickAnalyzeSQlTime = DoClickAnalyzeSQlTime;
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
	
	function DoClickAnalyzeWaitingTime() 
	{
		$scope.TrOptions.WaitingTime.On = $scope.TrOptions.WaitingTime.On != true;
	}
	
		   
	function DoClickAnalyzeSQlTime() 
	{
		$scope.TrOptions.SQlTime.On = $scope.TrOptions.SQlTime.On != true;
	}	
	
	function DoClickAnalyzeTrace()
	{
		if (TrAnalyze.TraceFile == "")
			alert('Bitte wählen Sie zuerst eine Tracedatei aus.')
			
		else
		{								
			$scope.TrOptions.VisibleController = TrVisibility.VisibleController.Status;
		}
	}; 	
	
	function DoFileNameChanged(element)
	{
		$scope.TraceLoading = true;
		$scope.$apply();
		
		var l_Reader = new FileReader();

		l_Reader.onload = DoOnLoad;		
		l_Reader.readAsText(element.files[0]);
		
		function DoOnLoad() 
		{
			TrAnalyze.TraceFile = l_Reader.result;

			$scope.TraceLoading = false;
			$scope.$apply();
		}		
	}	
});

l_App.controller('CtrTrStatus', function($scope, $sce, $q, $timeout, TrOptions, TrVisibility, TrAnalyze, TrStatistics, TrGridOptions) 
{
	// Variables
	$scope.TrVisibility = TrVisibility;
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
		if (TrOptions.VisibleController != TrVisibility.VisibleController.Status)
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
		$scope.TrOptions.VisibleController = TrVisibility.VisibleController.Chart;
	}
});

l_App.controller('CtrTrChart', function($scope, $sce, TrOptions, TrVisibility, TrAnalyze, TrStatistics) 
{
	// Variables
	$scope.TrVisibility = TrVisibility;
	$scope.TrOptions = TrOptions;
	$scope.TrAnalyze = TrAnalyze;	
	$scope.ChartType = 'SqlTime';	
	$scope.ChartOptions = {legend: {display: true},
						   tooltips: {enabled: true, 
				                      callbacks: {label: function(tooltipItem, data) {
												  var label = data.labels[tooltipItem.index];
												  var datasetLabel = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
													return 'Nummer: ' + TrAnalyze.TraceRows[tooltipItem.index].Id + ' Zeit: ' + datasetLabel +  ' ' +  TrAnalyze.TraceRows[tooltipItem.index].Sql.substring(0, 110);
													}
												  }
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
		$scope.TrOptions.VisibleController = TrVisibility.VisibleController.Input;			
	};

    function DoShowResult() 
	{
		$scope.TrOptions.VisibleController = TrVisibility.VisibleController.Result;			
	};
	
	function DoShowChart()
	{	
		if (TrOptions.VisibleController != TrVisibility.VisibleController.Chart)
			return;
		
		$scope.labels = _.map(TrAnalyze.TraceRows, 'TimeStampStr');

		if ($scope.ChartType == 'SqlTime')
		{
			$scope.series = ['Laufzeit'];
			$scope.data = [_.map(TrAnalyze.TraceRows, 'SqlTime')];
		}
		
		else if  ($scope.ChartType == 'WaitingTime')
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

l_App.controller('CtrTrResult', function($scope, $sce, uiGridConstants, TrOptions, TrVisibility, TrAnalyze, TrStatistics, TrGridOptions ) 
{
	// Variables
	$scope.TrStatistics = TrStatistics;
	$scope.TrVisibility = TrVisibility;
	$scope.TrOptions = TrOptions;	
	$scope.TrAnalyze = TrAnalyze;
	
	$scope.TraceRows = [];
	$scope.GridOptions = TrGridOptions;
	$scope.GridOptions.onRegisterApi = DoRegisterGridApi;

	// Events
	$scope.OnClickShowInput = DoShowInput;
	$scope.OnClickShowChart = DoClickShowChart;	
	
	$scope.$watch('TrAnalyze.TraceRows', DoTraceResultChanged);
	$scope.$watch('TrOptions.SelectedIndex', DoSelectedIndexChanged);
	
	// Methods	

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
		$scope.TraceRows = TrAnalyze.TraceRows;
	}	

	function DoShowInput() 
	{
		$scope.TrOptions.VisibleController = TrVisibility.VisibleController.Input;
	};

	function DoClickShowChart() 
	{
		$scope.TrOptions.VisibleController = TrVisibility.VisibleController.Chart;
	};	
});



