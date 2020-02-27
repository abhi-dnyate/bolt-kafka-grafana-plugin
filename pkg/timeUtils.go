package main

import "strings"

func getRelativeTimeString(timeStr string, isStartTime bool) string {

	if strings.HasSuffix(timeStr, "s") {
		timeStr = strings.TrimSuffix(timeStr, "s")
		timeStr = timeStr + "SECOND"
	} else if strings.HasSuffix(timeStr, "m") {
		timeStr = strings.TrimSuffix(timeStr, "m")
		timeStr = timeStr + "MINUTE"
	} else if strings.HasSuffix(timeStr, "h") {
		timeStr = strings.TrimSuffix(timeStr, "h")
		timeStr = timeStr + "HOUR"
	} else if strings.HasSuffix(timeStr, "d") {
		timeStr = strings.TrimSuffix(timeStr, "d")
		timeStr = timeStr + "DAY"
	}

	timeStr = strings.ToUpper(timeStr)

	if isStartTime {
		timeStr = "NOW-" + timeStr
	}
	return timeStr
}
