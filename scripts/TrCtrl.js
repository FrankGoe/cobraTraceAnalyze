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
			$scope.TrVisibility.ShowInput = false; 
			$scope.TrVisibility.ShowStatus = true;
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

l_App.controller('CtrTrStatus', function($scope, $sce, $q, $timeout, TrVisibility, TrAnalyze, TrStatistics, TrGridOptions) 
{
	// Variables
	$scope.TrVisibility = TrVisibility;
	
	// Events
	$scope.$watch('TrVisibility.ShowStatus', DoShowStatusChange); 
		
	// Methods
	function ExecuteAnalyze()
	{	
		// Execute Async
		$q.when(TrAnalyze.AnalyzeTrace()).then(DoAnalyzeFinished()); 			
	}
	
	function DoShowStatusChange()
	{
		if (TrVisibility.ShowStatus)
		{				
			$scope.StatusText = $sce.trustAsHtml('Trace wird analysiert. Bitte warten...');
			
			// kurz warten und Analyze durchführen
			$timeout(ExecuteAnalyze, 50); 
		}			   
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
		TrVisibility.ShowStatus = false;
		TrVisibility.ShowResult = false;		
		TrVisibility.ShowChart = true;	
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
	$scope.HasTimestamps = false;	
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
			$scope.gridApi.grid.columns[1].filters[0] = {
				condition: uiGridConstants.filter.STARTS_WITH,
				term: TrAnalyze.TraceRows[$scope.TrOptions.SelectedIndex].Id
			  };			
		}
	}

	function DoTraceResultChanged()
	{
		$scope.TraceRows = TrAnalyze.TraceRows;
		$scope.HasTimestamps = TrAnalyze.HasTimestamps;			
	}	

	function DoShowInput() 
	{
		TrVisibility.ShowInput = true;
		TrVisibility.ShowResult = false;
		TrVisibility.ShowChart = false;				
	};

	function DoClickShowChart() 
	{
		TrVisibility.ShowInput = false;
		TrVisibility.ShowResult = false;
		TrVisibility.ShowChart = true;		
	};	
});

l_App.controller('CtrTrChart', function($scope, $sce, TrOptions, TrVisibility, TrAnalyze, TrStatistics) 
{
	// Variables
	$scope.TrVisibility = TrVisibility;
	$scope.TrOptions = TrOptions;
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
	
	$scope.$watch('TrVisibility.ShowChart', DoShowChart); 
	
	// Methods

	function DoChartClick(points, evt) 
	{
		if (points != undefined && points.length == 1)
		{
			DoShowResult();
			$scope.TrOptions.SelectedIndex = points[0]._index;

			$scope.$apply();				
			//alert(TrAnalyze.TraceRows[l_TraceRowIdx].Sql);
		}		
	}

    function DoShowInput() 
	{
		TrVisibility.ShowInput = true;
		TrVisibility.ShowChart = false;
		TrVisibility.ShowResult = false;
	};

    function DoShowResult() 
	{
		TrVisibility.ShowInput = false;
		TrVisibility.ShowChart = false;
		TrVisibility.ShowResult = true;
	};
	
	function DoShowChart()
	{	
		$scope.labels = _.map(TrAnalyze.TraceRows, 'TimeStampStr');

		if ($scope.ChartType == 'SqlTime')
		{
			$scope.series = ['Laufzeit'];
			$scope.data = [_.map(TrAnalyze.TraceRows, 'SqlTime')];
		}
		else
		{
			$scope.series = ['Wartezeit'];
			$scope.data = [_.map(TrAnalyze.TraceRows, 'WaitingTime')];
		}
	}	
});




