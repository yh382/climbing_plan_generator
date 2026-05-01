import ExpoModulesCore

// Grade pyramid: one row per grade, color is hex computed by JS service
// (buildFixedGradePyramid → getGradeColor). Score drives y-axis ordering.
struct GradeBarData: Record {
    @Field var grade: String
    @Field var count: Int
    @Field var color: String
    @Field var score: Int

    init() {}
}

// Ability radar: 5 fixed dimensions, each 0..100.
struct RadarData: Record {
    @Field var finger: Double
    @Field var pull: Double
    @Field var core: Double
    @Field var flex: Double
    @Field var sta: Double

    init() {}
}

// Training volume: one row per slot (W=7 days / M=4 weeks / Y=12 months).
// Wrapper aggregates raw logs + intensityData into these flat buckets.
struct VolumeSlot: Record {
    @Field var slotKey: String
    @Field var label: String
    @Field var isCurrent: Bool
    @Field var isFuture: Bool

    @Field var boulderEasy: Int
    @Field var boulderMid: Int
    @Field var boulderHard: Int
    @Field var boulderElite: Int

    @Field var ropeBeginner: Int
    @Field var ropeIntermediate: Int
    @Field var ropeAdvanced: Int
    @Field var ropeExpert: Int
    @Field var ropeElite: Int

    @Field var intensity: Double

    init() {}
}
