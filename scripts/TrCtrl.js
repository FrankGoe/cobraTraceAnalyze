l_App = angular.module('TrApp');

l_App.controller('CtrTrInput', function($scope, $timeout, $q, $http, TrVisibility, TrAnalyze, TrFilter) 
{      	
	// Scope Variables
	$scope.TrVisibility = TrVisibility;		
	$scope.TrFilter = TrFilter;
	
	// Scope Events
	$scope.OnClickAnalzyeTrace = DoClickAnalyzeTrace;
	$scope.OnFileNameChanged = DoFileNameChanged;
	$scope.OnClickAnalyzeWaitingTime = DoClickAnalyzeWaitingTime;
	$scope.OnClickAnalyzeSQlTime = DoClickAnalyzeSQlTime;
	$scope.TraceLoading = true;
	
	InitLocation();

	function InitLocation()
	{
		$scope.Standort = {isp : "", city : "", country : "", query : ""};
		
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
		$scope.TrFilter.WaitingTime.On = $scope.TrFilter.WaitingTime.On != true;
	}
	
		   
	function DoClickAnalyzeSQlTime() 
	{
		$scope.TrFilter.SQlTime.On = $scope.TrFilter.SQlTime.On != true;
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
		
		var reader = new FileReader();

		reader.onload = DoOnLoad;		
		reader.readAsText(element.files[0]);
		
		function DoOnLoad() 
		{
			TrAnalyze.Data.TraceFile = reader.result;
			$scope.TraceLoading = false;
			$scope.$apply();
		}		
	}	
});

l_App.controller('CtrTrStatus', function($scope, $sce, $q, $timeout, TrVisibility, TrAnalyze, TrStatistics, TrGridOptions) 
{
	// Scope Variables
	$scope.TrVisibility = TrVisibility;
	
	// Scope Events
	$scope.$watch('TrVisibility.ShowStatus', OnShowStatusChange); 
		
	// Methods
	function ExecuteAnalyze()
	{	
		// Execute Async
		$q.when(TrAnalyze.AnalyzeTrace()).then(OnAnalyzeFinished()); 			
	}
	
	function OnShowStatusChange()
	{
		if (TrVisibility.ShowStatus)
		{				
			$scope.StatusText = $sce.trustAsHtml('Trace wird analysiert. Bitte warten...');
			
			// kurz warten und Analyze durchführen
			$timeout(ExecuteAnalyze, 50); 
		}			   
	}
	
	function OnAnalyzeFinished(p_Result) 
	{
		// Statustext
		$scope.StatusText = $sce.trustAsHtml("Ergebnismenge mit " + TrStatistics.Filtered.Count + " SQL-Statements wird geladen. Bitte warten...");

		if (TrAnalyze.Data.HasTimestamps)
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
		TrVisibility.ShowResult = true;			  																						
	}
});

l_App.controller('CtrTrResult', function($scope, $sce, TrFilter, TrVisibility, TrAnalyze, TrStatistics, TrGridOptions ) 
{
	// Scope Variables
	$scope.TrStatistics = TrStatistics;
	$scope.TrVisibility = TrVisibility;
	$scope.TrFilter = TrFilter;	
	$scope.AnalyzeData = TrAnalyze.Data;
	$scope.HasTimestamps = false;
	
	// Scope Events
	$scope.OnClickShowTrace = DoClickShowTrace;
	$scope.GetResultHtml = DoGetResultHtml;
	
	$scope.TraceRows = [];
	$scope.GridOptions = TrGridOptions;
	$scope.$watch('AnalyzeData.TraceRows', OnTraceRowChanged); 
	
	// Events
	function OnTraceRowChanged()
	{
		$scope.TraceRows = TrAnalyze.Data.TraceRows;		
		$scope.HasTimestamps = TrAnalyze.Data.HasTimestamps;
	}	
	
	// Methods	
    function DoClickShowTrace() 
	{
		TrVisibility.ShowInput = true;
		TrVisibility.ShowResult = false;
	};

	function DoGetResultHtml()
	{
		return $sce.trustAsHtml(TrAnalyze.RowsAsTable());		
	};
});



