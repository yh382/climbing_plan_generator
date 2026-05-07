import ExpoModulesCore

public class ClimmateActivityRingModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ClimmateActivityRing")

        // MARK: ActivityRingView (single ring, gradient + overlap + tip shadow)
        View(ActivityRingView.self) {
            Prop("progress") { (v: ActivityRingView, x: Double) in v.progress = x }
            Prop("color") { (v: ActivityRingView, x: String) in v.color = x }
            Prop("bgTrackColor") { (v: ActivityRingView, x: String) in v.bgTrackColor = x }
            Prop("thickness") { (v: ActivityRingView, x: Double) in v.thickness = x }
        }

        // MARK: DualActivityRingView (outer + inner concentric rings)
        View(DualActivityRingView.self) {
            Prop("trainingPct")  { (v: DualActivityRingView, x: Double) in v.trainingPct  = x }
            Prop("climbCount")   { (v: DualActivityRingView, x: Int)    in v.climbCount   = x }
            Prop("climbGoal")    { (v: DualActivityRingView, x: Int)    in v.climbGoal    = x }
            Prop("outerColor")   { (v: DualActivityRingView, x: String) in v.outerColor   = x }
            Prop("innerColor")   { (v: DualActivityRingView, x: String) in v.innerColor   = x }
            Prop("bgTrackColor") { (v: DualActivityRingView, x: String) in v.bgTrackColor = x }
            Prop("thickness")    { (v: DualActivityRingView, x: Double) in v.thickness    = x }
            Prop("gap")          { (v: DualActivityRingView, x: Double) in v.gap          = x }
        }

        // MARK: CalendarDayRingView (Apple Fitness-style stacked rings + tap)
        View(CalendarDayRingView.self) {
            // `onPress` clashes with RN's bubble event `topPress`; use onTap.
            Events("onTap")

            Prop("dayLabel")      { (v: CalendarDayRingView, x: String) in v.dayLabel = x }
            Prop("durationMin")   { (v: CalendarDayRingView, x: Double) in v.durationMin = x }
            Prop("durationGoal")  { (v: CalendarDayRingView, x: Double) in v.durationGoal = x }
            Prop("sendCount")     { (v: CalendarDayRingView, x: Int)    in v.sendCount = x }
            Prop("sendGoal")      { (v: CalendarDayRingView, x: Int)    in v.sendGoal = x }
            Prop("planProgress")  { (v: CalendarDayRingView, x: Double) in v.planProgress = x }
            Prop("isSelected")    { (v: CalendarDayRingView, x: Bool)   in v.isSelected = x }
            Prop("isToday")       { (v: CalendarDayRingView, x: Bool)   in v.isToday = x }
            Prop("isCurrentMonth") { (v: CalendarDayRingView, x: Bool)  in v.isCurrentMonth = x }

            Prop("outerBaseColor")        { (v: CalendarDayRingView, x: String) in v.outerBaseColor = x }
            Prop("innerBaseColor")        { (v: CalendarDayRingView, x: String) in v.innerBaseColor = x }
            Prop("ringTrackColor")        { (v: CalendarDayRingView, x: String) in v.ringTrackColor = x }
            Prop("selectedBg")            { (v: CalendarDayRingView, x: String) in v.selectedBg = x }
            Prop("dayTextColor")          { (v: CalendarDayRingView, x: String) in v.dayTextColor = x }
            Prop("selectedTextColor")     { (v: CalendarDayRingView, x: String) in v.selectedTextColor = x }
            Prop("inactiveTextColor")     { (v: CalendarDayRingView, x: String) in v.inactiveTextColor = x }
            Prop("outsideTextColor")      { (v: CalendarDayRingView, x: String) in v.outsideTextColor = x }
            Prop("planDotColorComplete")  { (v: CalendarDayRingView, x: String) in v.planDotColorComplete = x }
            Prop("planDotColorInProgress") { (v: CalendarDayRingView, x: String) in v.planDotColorInProgress = x }
            Prop("todayDotColor")         { (v: CalendarDayRingView, x: String) in v.todayDotColor = x }
        }
    }
}
