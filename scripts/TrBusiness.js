l_App = angular.module('TrApp');

l_App.factory('TrAnalyze', function(TrOptions, TrStatistics, TrFilterType) 
{
	function StrIsNumber(p_String) 
	{
		var l_Reg = new RegExp("^[-]?[0-9]+[\.]?[0-9]+$");
		return l_Reg.test(p_String.replace(" ",""));
	}

	function Reset()
	{
		TrOptions.SelectedIndex = -1;
		TrStatistics.Filtered.Count = 0;
		TrStatistics.Filtered.AvgTraceTime = 0;
		TrStatistics.Filtered.SumTraceTime = 0;
		TrStatistics.Filtered.SumWaitingTime = 0;		
		
		TrStatistics.Total.Count = 0;
		TrStatistics.Total.SumTraceTime = 0;
		TrStatistics.Total.AvgTraceTime = 0;	
		TrStatistics.Total.SumWaitingTime = 0;		
		TrStatistics.Total.SumTimestampTime = 0;		
	}	
		
	function GetTimeStampAsString(p_Timestamp)
	{
		if (!isNaN(p_Timestamp))
			return _.padStart(p_Timestamp.getDate(), 2, '0') + "." + _.padStart(p_Timestamp.getMonth(), 2, '0') + "." + p_Timestamp.getFullYear() + " " + _.padStart(p_Timestamp.getHours(), 2, '0') + ":" + _.padStart(p_Timestamp.getMinutes(), 2, '0') + ":" + _.padStart(p_Timestamp.getSeconds(), 2, '0')+ "." + _.padStart(p_Timestamp.getMilliseconds(), 3, '0')
		else
			return "";
	}
	
	function GetTimeStampFromRow(p_Row)
	{
		//20170623 155446.662 Year, month[, date[, hours[, minutes[, seconds[, milliseconds]]
		return new Date(p_Row.substr(0,4), p_Row.substr(4,2), p_Row.substr(6,2), p_Row.substr(9,2), p_Row.substr(11,2), p_Row.substr(13,2), p_Row.substr(16,3));		
	}
	
	function TimeToFormattedStr(p_Time)
	{
		var l_Seconds = p_Time;
		var l_Hours = 0;
		var l_Minutes = 0;	
		
		if (p_Time > 60)
		{
			l_Minutes = Math.trunc(p_Time / 60);
			l_Seconds = (p_Time % 60); // Modulo
		}

		if (l_Minutes > 60)
		{
			l_Hours =  Math.trunc(l_Minutes / 60);
			l_Minutes = Math.trunc(l_Minutes % 60);
		}
		
		if (l_Hours > 0)
		{
			return  l_Hours + " std " +  l_Minutes + " min " + l_Seconds.toFixed(3) + " sec";
		}

		else if (l_Minutes > 0)
		{
			return l_Minutes + " min " + l_Seconds.toFixed(3) + " sec";			
		}
		else
		{
			return l_Seconds.toFixed(3) + " sec";
		}
	}

	function GetSqlTime(p_Row)
	{		
		var l_TimeStr = ((p_Row.substr(0,5) == "Time:") ? p_Row.substr(6, p_Row.length) : "").replace("[WARNING]","").trim();
		var l_Time = 0;
		var l_Idx = -1;

		// Milisekunden suchen
		l_Idx = l_TimeStr.lastIndexOf(".");

		if (l_Idx === -1)
			return l_Time;

		l_Time = parseInt(l_TimeStr.substr(l_Idx + 1, l_TimeStr.length)) / 1000; 
		l_TimeStr = l_TimeStr.substr(0, l_Idx);

		// Sekunden suchen
		l_Idx = l_TimeStr.lastIndexOf(":");		

		if (l_Idx === -1)
		{
			if (l_TimeStr !== "")
				l_Time = l_Time + parseInt(l_TimeStr)
			
			return l_Time;
		}

		l_Time = l_Time + parseInt(l_TimeStr.substr(l_Idx + 1, l_TimeStr.length));
		l_TimeStr = l_TimeStr.substr(0, l_Idx);				

		// Minuten auslesen
		l_Idx = l_TimeStr.lastIndexOf(":")

		if (l_Idx === -1)
		{
			if (l_TimeStr !== "")
				l_Time = l_Time + parseInt(l_TimeStr) * 60;

			return l_Time;		
		}

		l_Time = l_Time + parseInt(l_TimeStr.substr(l_Idx + 1, l_TimeStr.length)) * 60; 
		l_TimeStr = l_TimeStr.substr(0, l_Idx);		

		// Stunden auslesen
		l_Idx = l_TimeStr.lastIndexOf(":")
		
		if (l_Idx === -1)
		{
			if (l_TimeStr !== "")
				l_Time = l_Time + parseInt(l_TimeStr) * 3600;

			return l_Time;		
		}

		l_Time = l_Time + parseInt(l_TimeStr.substr(l_Idx + 1, l_TimeStr.length)) * 3600 ; 
		l_TimeStr = l_TimeStr.substr(0, l_Idx);			
								
		return _.round(l_Time, 3);
	}	
	
	function FilterResult(p_ResultArr)
	{
		var l_FilteredResult = [];
		
		for (var i = 0; i < p_ResultArr.length; i++) 
		{
			var l_Item = p_ResultArr[i];	
			
			 l_Item.Id = l_FilteredResult.length + 1, 
			
			TrStatistics.Total.Count++;
			TrStatistics.Total.SumTraceTime = TrStatistics.Total.SumTraceTime + l_Item.SqlTime;			
			TrStatistics.Total.SumWaitingTime = TrStatistics.Total.SumWaitingTime + l_Item.WaitingTime;			
			
			if 	(
					(TrOptions.currentFilter.Id == TrFilterType[1].Id && (l_Item.SqlTime > TrOptions.FilterTime)) || 
					(TrOptions.currentFilter.Id == TrFilterType[2].Id && (l_Item.WaitingTime > TrOptions.FilterTime)) ||
					(TrOptions.currentFilter.Id == TrFilterType[0].Id)
				)		   
			{				
				TrStatistics.Filtered.Count++;
				TrStatistics.Filtered.SumTraceTime = TrStatistics.Filtered.SumTraceTime + l_Item.SqlTime;
				TrStatistics.Filtered.SumWaitingTime = TrStatistics.Filtered.SumWaitingTime + l_Item.WaitingTime;				
				
				//LineItem zu Ergebnisarray hinzufügen
				l_FilteredResult.push(l_Item);									
			}			
		}		
		
		return l_FilteredResult;
	}	
	
	function CreateTraceItem(p_LineParams, p_ResultArr, p_HasTimestamps, p_SqlTime) 
	{	
		if (p_LineParams.SQLText.length > 0)
		{					
			var l_TimeStampStr = GetTimeStampAsString(p_LineParams.SQLTimestamp);

			var l_Item = {
				 	  	  Id: p_ResultArr.length + 1, 
						  SqlTime: p_SqlTime,
						  SqlTimeStr: TimeToFormattedStr(p_SqlTime),
						  TimeStamp: p_LineParams.SQLTimestamp,
						  TimeStampStr:l_TimeStampStr,
						  TimeStampStrShort:l_TimeStampStr.substr(11,8),
						  WaitingTime: 0, 
						  WaitingTimeStr: "0",						  
						  Typ: p_LineParams.TraceType,  
						  Sql: p_LineParams.SQLText,
						  ChartArgument: p_LineParams.SQLTimestamp
						};

			if (!p_HasTimestamps)						
				l_Item.ChartArgument = p_LineParams.Id;

			p_ResultArr.push(l_Item);
			
			// Wartezeit des vorherigen Statements berechnen 
			if (p_HasTimestamps && p_ResultArr.length > 1)
			{
				l_PrevItem = p_ResultArr[p_ResultArr.length -2];								
				l_PrevItem.WaitingTime = Number((l_PrevItem.TimeStamp.getTime() != new Date(0).getTime()) ?  (l_Item.TimeStamp - l_PrevItem.TimeStamp - (l_PrevItem.SqlTime * 1000)) / 1000 : 0);
				
				if (l_PrevItem.WaitingTime < 0)
					l_PrevItem.WaitingTime = 0;

				l_PrevItem.WaitingTimeStr = TimeToFormattedStr(l_PrevItem.WaitingTime);
			}
		}
		
		// LineParams zurücksetzen
		p_LineParams.SQLText = "";		
		p_LineParams.TraceType = "";		
		p_LineParams.SQLTimestamp = new Date(0);
	}	
	
	function IsSqlStatement(p_Row)
	{
		return 	(p_Row.toUpperCase().search("SELECT")  > -1 || 
				p_Row.toUpperCase().search("UPDATE")  > -1 ||
				p_Row.toUpperCase().search("DELETE")  > -1 ||
				p_Row.toUpperCase().search("INSERT")  > -1  ||
				p_Row.toUpperCase().search("DROP")  > -1  ||				
				p_Row.toUpperCase().search("ALTER")  > -1  ||				
				p_Row.toUpperCase().search("CREATE")  > -1 )

	}
	
	return {
		TraceFile: "",
		FileName: "",
		TraceRows: [], 
		HasTimestamps : false,
					
		CreateEmptyItem: function()
		{
			return {
					Id: "", 
					SqlTime: 0,
					SqlTimeStr: "",
					TimeStamp: 0,
					TimeStampStr: "",
					TimeStampStrShort: "",
					WaitingTime: 0, 
					WaitingTimeStr: "",						  
					Typ: "",  
					Sql: "",
					ChartArgument: 0
				  };
		},
	
		AnalyzeTrace: function() {
			var l_Rows = this.TraceFile.split("\n");
			var l_ResultArr = [];		
			var l_ReadSQL= false;
			var l_Skip = false;		
			var l_SciParsing = false;
			var l_LineParams = {SQLText: "", TraceType: "", SQLTimestamp: new Date(0)};
			var l_CurrentTimestamp;
			var l_FirstTimestamp;
			var l_LastTimestamp;
			
			Reset();
						
			// Trace started enthält keinen timestamp und muss entfernt werden
			if (l_Rows.length > 0 && l_Rows[0].search("TRACE started") > -1)
				l_Rows.splice(0, 1); 

			for (var i = 0; i < l_Rows.length; i++) 
			{
				var l_Row = l_Rows[i];	
				
				if (i == 0)
				{
					if (StrIsNumber(l_Row.substr(0, 19)))
						this.HasTimestamps = true	
					else
						this.HasTimestamps = false;
				}

				// Zeitstempel auslesen
				if (this.HasTimestamps)
				{			
					l_CurrentTimestamp = GetTimeStampFromRow(l_Row);
												
					// Zeitstempel entfernen
					l_Row =  l_Row.substr(20, l_Row.length);

					if (i == 0)
						l_FirstTimestamp = l_CurrentTimestamp
					
					if (l_Row != "")
						l_LastTimestamp = l_CurrentTimestamp;
						
				}
				
				// uninteressant
				if (l_Row.search("ANSI_NULLS") > -1 && l_Row.length > 0)
					continue;
				
				// Lesevorgang beenden
				if (l_ReadSQL == true && (l_Row.substr(0,2) == ">>" || 
										  l_Row.substr(0,5) == "Time:" ||
										   (IsSqlStatement(l_Row) && l_LineParams.TraceType == 'INFO')))
				{											
					CreateTraceItem(l_LineParams, l_ResultArr, this.HasTimestamps, GetSqlTime(l_Row));	
					l_ReadSQL = false;
				}

				// Lesevorgang starten
				if (l_SciParsing == false && l_ReadSQL == false && l_Row.substr(0,2) != ">>")	
				{
					if (l_LineParams.TraceType == '')
					{
						if (IsSqlStatement(l_Row))
						   l_LineParams.TraceType  = 'SQL'
						else
							l_LineParams.TraceType = 'INFO';
					}
					
					l_ReadSQL = true;			
					l_LineParams.SQLTimestamp = l_CurrentTimestamp;
				}
		
				// Sci start parsing
				if (l_Row.substr(0,6) == ">> SCI")
				{
					if (l_Row.search(": start parsing") > 0)
					{
						l_SciParsing = true;	
						l_LineParams.TraceType = "SCI ".concat(l_Row.substr(7,l_Row.indexOf("(DBVersion") - 7)) ;
					}
				}

				// Sci stop parsing
				if (l_SciParsing && l_Row.substr(0,2) == ">>" && l_Row.search(": start parsing") == -1)
					l_SciParsing = false;
				
				// SQL auslesen
				if (l_SciParsing == false && // SCI weglassen
					l_Row.length > 0 &&  // keine leeren Zeilen
					l_ReadSQL && // im LeseModus 
					l_Row.substr(0,5) != "Time:" && // keine Zeitinformationen 
					l_Row.substr(0,2) != ">>") // keine Steuerzeilen
				{
					l_LineParams.SQLText =  l_LineParams.SQLText === "" ? l_LineParams.SQLText.concat(l_Row) : l_LineParams.SQLText.concat("\n".concat(l_Row)); 
				}									
			}
				 
			// Sofern noch ein Lesevorgang nicht zuende geschrieben wurde diesen nun beenden
			if (l_ReadSQL == true)
				CreateTraceItem(l_LineParams, l_ResultArr, this.HasTimestamps, 0);		
			
			this.TraceRows = FilterResult(l_ResultArr);
			
			TrStatistics.Filtered.AvgTraceTime = TrStatistics.Filtered.SumTraceTime / TrStatistics.Filtered.Count;
			TrStatistics.Total.AvgTraceTime = TrStatistics.Total.SumTraceTime / TrStatistics.Total.Count;		

			if (this.HasTimestamps)
				TrStatistics.Total.SumTimestampTime = ((l_LastTimestamp - l_FirstTimestamp) / 1000);
		},
		
		RowsAsTable: function() 
		{
			var l_Template = '<table><tbody>';
			
			for (var i = 0; i < this.TraceRows.length; i++) 		
			{
				l_Row = this.TraceRows[i];			
				l_Template = l_Template + '<tr><td>' + l_Row.Id + '</td><td>' + GetTimeStampAsString(l_Row.TimeStamp) + '</td><td>' + Number(l_Row.SqlTime).toFixed(3) + '</td><td>' + Number(l_Row.WaitingTime).toFixed(3) + '</td><td>' + l_Row.Typ + '</td><td>' + l_Row.Sql + '</td></tr>';		
			}
			
			l_Template = l_Template + '</tbody></table>';		
			
			return l_Template;
		}		
	}		
});