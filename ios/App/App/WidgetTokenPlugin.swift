import Foundation
import Capacitor

@objc(WidgetTokenPlugin)
public class WidgetTokenPlugin: CAPPlugin {
    
    private let SUITE_NAME = "group.com.oryxa.app"
    private let KEY_JWT_TOKEN = "jwt_token"
    
    private func getUserDefaults() -> UserDefaults? {
        return UserDefaults(suiteName: SUITE_NAME)
    }
    
    @objc func saveToken(_ call: CAPPluginCall) {
        guard let token = call.getString("token") else {
            call.reject("Token is required")
            return
        }
        
        guard let userDefaults = getUserDefaults() else {
            call.reject("Failed to access App Group storage")
            return
        }
        
        userDefaults.set(token, forKey: KEY_JWT_TOKEN)
        userDefaults.synchronize()
        
        call.resolve([
            "success": true
        ])
        
        print("WidgetToken: Token saved successfully")
    }
    
    @objc func removeToken(_ call: CAPPluginCall) {
        guard let userDefaults = getUserDefaults() else {
            call.reject("Failed to access App Group storage")
            return
        }
        
        userDefaults.removeObject(forKey: KEY_JWT_TOKEN)
        userDefaults.synchronize()
        
        call.resolve([
            "success": true
        ])
        
        print("WidgetToken: Token removed successfully")
    }
    
    @objc func getToken(_ call: CAPPluginCall) {
        guard let userDefaults = getUserDefaults() else {
            call.reject("Failed to access App Group storage")
            return
        }
        
        let token = userDefaults.string(forKey: KEY_JWT_TOKEN)
        
        call.resolve([
            "token": token ?? NSNull()
        ])
    }
}
