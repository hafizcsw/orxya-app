import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> GlancesEntry {
        GlancesEntry(date: Date(), glances: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (GlancesEntry) -> ()) {
        let entry = GlancesEntry(date: Date(), glances: nil)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        Task {
            do {
                let glances = try await fetchGlances()
                let entry = GlancesEntry(date: Date(), glances: glances)
                
                // Update every 15 minutes
                let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
                let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
                
                completion(timeline)
            } catch {
                print("Error fetching glances: \(error)")
                let entry = GlancesEntry(date: Date(), glances: nil)
                let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60)))
                completion(timeline)
            }
        }
    }
    
    func fetchGlances() async throws -> GlancesData {
        guard let jwt = UserDefaults(suiteName: "group.com.oryxa.app")?.string(forKey: "jwt_token") else {
            throw WidgetError.noToken
        }
        
        let url = URL(string: "https://gcjggazmatipzqnxixhp.supabase.co/functions/v1/glances-feed")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = "{}".data(using: .utf8)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(GlancesResponse.self, from: data)
        return response.glances
    }
}

struct GlancesEntry: TimelineEntry {
    let date: Date
    let glances: GlancesData?
}

struct GlancesResponse: Codable {
    let glances: GlancesData
}

struct GlancesData: Codable {
    let next_task: NextTask?
    let prayer_next: Prayer?
    let steps_today: Steps?
    let work_progress: WorkProgress?
    let conflicts_badge: ConflictsBadge?
}

struct NextTask: Codable {
    let title: String
    let start_at: String?
}

struct Prayer: Codable {
    let name: String
    let time: String
}

struct Steps: Codable {
    let steps: Int
}

struct WorkProgress: Codable {
    let hours: Int
    let minutes: Int
}

struct ConflictsBadge: Codable {
    let count: Int
}

enum WidgetError: Error {
    case noToken
}

struct TodayWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            Color(red: 0.1, green: 0.1, blue: 0.1)
            
            VStack(alignment: .leading, spacing: 12) {
                // Header
                Text("Oryxa - نظرة سريعة")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                
                // Next Task
                if let nextTask = entry.glances?.next_task {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("المهمة التالية")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                        
                        Text(nextTask.title)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        
                        if let startAt = nextTask.start_at {
                            Text(timeRemaining(from: startAt))
                                .font(.system(size: 10))
                                .foregroundColor(Color(red: 0, green: 0.85, blue: 1))
                        }
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(red: 0.16, green: 0.16, blue: 0.16))
                    .cornerRadius(10)
                } else {
                    VStack(alignment: .leading) {
                        Text("لا توجد مهام قادمة")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(red: 0.16, green: 0.16, blue: 0.16))
                    .cornerRadius(10)
                }
                
                // Grid of other glances
                HStack(spacing: 8) {
                    // Prayer
                    if let prayer = entry.glances?.prayer_next {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("صلاة \(prayer.name)")
                                .font(.system(size: 10))
                                .foregroundColor(.white)
                            Text(prayer.time)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(Color(red: 0, green: 0.85, blue: 1))
                        }
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(red: 0.16, green: 0.16, blue: 0.16))
                        .cornerRadius(8)
                    }
                    
                    // Steps
                    if let steps = entry.glances?.steps_today {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("الخطوات")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                            Text("\(steps.steps)")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(red: 0.16, green: 0.16, blue: 0.16))
                        .cornerRadius(8)
                    }
                }
                
                HStack(spacing: 8) {
                    // Work
                    if let work = entry.glances?.work_progress {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("العمل")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                            Text("\(work.hours)س \(work.minutes)د")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(red: 0.16, green: 0.16, blue: 0.16))
                        .cornerRadius(8)
                    }
                    
                    // Conflicts
                    if let conflicts = entry.glances?.conflicts_badge {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("التعارضات")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                            Text("\(conflicts.count)")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(Color(red: 1, green: 0.42, blue: 0.42))
                        }
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(red: 0.16, green: 0.16, blue: 0.16))
                        .cornerRadius(8)
                    }
                }
            }
            .padding(12)
        }
    }
    
    func timeRemaining(from startAt: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let startDate = formatter.date(from: startAt) else {
            return ""
        }
        
        let now = Date()
        let diff = startDate.timeIntervalSince(now)
        
        if diff < 0 {
            return "الآن"
        }
        
        let hours = Int(diff / 3600)
        let minutes = Int((diff.truncatingRemainder(dividingBy: 3600)) / 60)
        
        if hours > 0 {
            return "\(hours)س \(minutes)د"
        } else if minutes > 0 {
            return "\(minutes) دقيقة"
        } else {
            return "قريباً"
        }
    }
}

@main
struct TodayWidget: Widget {
    let kind: String = "TodayWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TodayWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Oryxa")
        .description("عرض سريع لمهامك وصلواتك اليومية")
        .supportedFamilies([.systemMedium])
    }
}
