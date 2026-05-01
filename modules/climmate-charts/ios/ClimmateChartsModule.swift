import ExpoModulesCore

public class ClimmateChartsModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ClimmateCharts")

        View(GradePyramidView.self) {
            Prop("data") { (view: GradePyramidView, data: [GradeBarData]) in
                view.data = data
            }
            Prop("climbType") { (view: GradePyramidView, climbType: String) in
                view.climbType = climbType
            }
            Prop("isActive") { (view: GradePyramidView, isActive: Bool) in
                view.isActive = isActive
            }
        }

        View(AbilityRadarView.self) {
            Prop("data") { (view: AbilityRadarView, data: RadarData) in
                view.data = data
            }
        }

        View(TrainingVolumeChartView.self) {
            Prop("slots") { (view: TrainingVolumeChartView, slots: [VolumeSlot]) in
                view.slots = slots
            }
            Prop("showBoulder") { (view: TrainingVolumeChartView, b: Bool) in
                view.showBoulder = b
            }
            Prop("showRope") { (view: TrainingVolumeChartView, b: Bool) in
                view.showRope = b
            }
            Prop("isActive") { (view: TrainingVolumeChartView, isActive: Bool) in
                view.isActive = isActive
            }
        }
    }
}
