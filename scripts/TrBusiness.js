l_App = angular.module('TrApp');

l_App.factory('TrAnalyze', function(TrFilter, TrStatistics) 
{
	function StrIsNumber(p_String) 
	{
		var l_Reg = new RegExp("^[-]?[0-9]+[\.]?[0-9]+$");
		return l_Reg.test(p_String.replace(" ",""));
	}

	function ResetStatistic()
	{
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
			return LPad(p_Timestamp.getHours()) + ":" + LPad(p_Timestamp.getMinutes()) + ":" + LPad(p_Timestamp.getSeconds()) + ":" + LPad(p_Timestamp.getMilliseconds(), 3)
		else
			return "";
	}
	
	function GetTimeStampFromRow(p_Row)
	{
		//20170623 155446.662 Year, month[, date[, hours[, minutes[, seconds[, milliseconds]]
		return new Date(p_Row.substr(0,4), p_Row.substr(4,2), p_Row.substr(6,2), p_Row.substr(9,2), p_Row.substr(11,2), p_Row.substr(13,2), p_Row.substr(16,3));		
	}
	
	function GetSqlTime(p_Row)
	{
		var l_TimeStr = (p_Row.substr(0,5) == "Time:") ? p_Row.substr(6, p_Row.length) : "";
		var l_Time = parseFloat(l_TimeStr.replace(/[^0-9]/g, "")) / 1000;
		
		if (isNaN(l_Time))
			l_Time = 0;
						
		return l_Time;
	}	
	
	function FilterResult(p_ResultArr)
	{
		var l_FilteredResult = [];
		
		for (var i = 0; i < p_ResultArr.length; i++) 
		{
			var l_Item = p_ResultArr[i];	
			
			TrStatistics.Total.Count++;
			TrStatistics.Total.SumTraceTime = TrStatistics.Total.SumTraceTime + l_Item.SqlTime;			
			TrStatistics.Total.SumWaitingTime = TrStatistics.Total.SumWaitingTime + l_Item.WaitingTime;			
			
			if 	(
					(TrFilter.SQlTime.On && (l_Item.SqlTime > TrFilter.SQlTime.Time)) || 
					(TrFilter.WaitingTime.On && (l_Item.WaitingTime > TrFilter.WaitingTime.Time)) ||
					(!TrFilter.WaitingTime.On && !TrFilter.SQlTime.On)
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
	
	function CreateTraceItem(p_LineParams, p_ResultArr, p_HasTimestamps) 
	{	
		if (p_LineParams.SQLText.length > 0)
		{					
			var l_Item = {Id: p_ResultArr.length + 1, 
						  SqlTime: Number(p_LineParams.SqlTime), 
						  TimeStamp: p_LineParams.SQLTimestamp,
						  TimeStampStr: GetTimeStampAsString(p_LineParams.SQLTimestamp),
						  WaitingTime: 0, 
						  Typ: GetTraceType(p_LineParams),  
						  Sql: p_LineParams.SQLText};

			p_ResultArr.push(l_Item);
			
			// Wartezeit des vorherigen Statements berechnen 
			if (p_HasTimestamps && p_ResultArr.length > 1)
			{
				l_PrevItem = p_ResultArr[p_ResultArr.length -2];								
				l_PrevItem.WaitingTime = Number((l_PrevItem.TimeStamp.getTime() != new Date(0).getTime()) ?  (l_Item.TimeStamp - l_PrevItem.TimeStamp - (l_PrevItem.SqlTime * 1000)) / 1000 : 0);
				
				if (l_PrevItem.WaitingTime < 0)
					l_PrevItem.WaitingTime = 0;
			}
		}
		
		// LineParams zurücksetzen
		p_LineParams.SQLText = "";		
		p_LineParams.TraceType = "";		
		p_LineParams.SqlTime = new Date(0);
		p_LineParams.SQLTimestamp = new Date(0);
	}	
	
	function LPad(p_Zahl, p_AnzStellen = 2, p_Fuellzeichen = "0" )
	{
		var l_Zahl = p_Zahl + "";
		
		while( l_Zahl.length < p_AnzStellen )
			l_Zahl = p_Fuellzeichen + l_Zahl;
		
		return l_Zahl;
	}
	
	function GetTraceType(p_LineParams)
	{
		if (p_LineParams.TraceType.length != 0) 
		{
			return p_LineParams.TraceType
		}
		else
		{
			if (p_LineParams.SQLText.toUpperCase().search("SELECT")  > -1 || 
				p_LineParams.SQLText.toUpperCase().search("UPDATE")  > -1 ||
				p_LineParams.SQLText.toUpperCase().search("DELETE")  > -1 ||
				p_LineParams.SQLText.toUpperCase().search("INSERT")  > -1  ||
				p_LineParams.SQLText.toUpperCase().search("DROP")  > -1  ||				
				p_LineParams.SQLText.toUpperCase().search("ALTER")  > -1  ||				
				p_LineParams.SQLText.toUpperCase().search("CREATE")  > -1 )
			 return "SQL"
			else
			 return "INFO";				
		}		
	}	
	
	return {
		TraceFile: "",
		TraceRows: [], 
		HasTimestamps : false,
					
		AnalyzeTrace: function() {
			var l_Rows = this.TraceFile.split("\n");
			var l_ResultArr = [];		
			var l_ReadSQL= false;
			var l_Skip = false;		
			var l_SciParsing = false;
			var l_LineParams = {SQLText: "", TraceType: "", SQLTimestamp: new Date(0), SqlTime: new Date(0)};
			var l_CurrentTimestamp;
			var l_FirstTimestamp;
			var l_LastTimestamp;
			
			ResetStatistic();
						
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
				
				// Lesevorgang starten
				if (l_SciParsing == false && l_ReadSQL == false && l_Row.substr(0,2) != ">>")	
				{
					l_ReadSQL = true;
					l_LineParams.SQLTimestamp = l_CurrentTimestamp;
				}

				// Lesevorgang beenden
				else if (l_ReadSQL == true && (l_Row.substr(0,2) == ">>" || l_Row.substr(0,5) == "Time:"))
				{	
					l_LineParams.SqlTime = GetSqlTime(l_Row); 
						
					CreateTraceItem(l_LineParams, l_ResultArr, this.HasTimestamps);	
					l_ReadSQL = false;	
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
					l_LineParams.SQLText = l_LineParams.SQLText.concat(" ".concat(l_Row)); 
				}									
			}
				 
			// Sofern noch ein Lesevorgang nicht zuende geschrieben wurde diesen nun beenden
			if (l_ReadSQL == true)
				CreateTraceItem(l_LineParams, l_ResultArr, this.HasTimestamps);		
			
			this.TraceRows = FilterResult(l_ResultArr);
			
			TrStatistics.Filtered.AvgTraceTime = TrStatistics.Filtered.SumTraceTime / TrStatistics.Filtered.Count;
			TrStatistics.Total.AvgTraceTime = TrStatistics.Total.SumTraceTime / TrStatistics.Total.Count;		

			if (this.HasTimestamps)
				TrStatistics.Total.SumTimestampTime = ((l_LastTimestamp - l_FirstTimestamp) / 1000); //.toFixed(3)		
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