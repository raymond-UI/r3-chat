"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Lock, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Key,
  Activity
} from "lucide-react";
import { useState } from "react";

interface SecurityStatusProps {
  hasApiKeys: boolean;
  lastUpdated?: number;
  encryptionEnabled: boolean;
  rateLimitStatus?: {
    remaining: number;
    resetTime: number;
  };
}

export function SecurityStatus({ 
  hasApiKeys, 
  lastUpdated, 
  encryptionEnabled = true,
  rateLimitStatus 
}: SecurityStatusProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getSecurityScore = () => {
    let score = 0;
    if (encryptionEnabled) score += 40;
    if (hasApiKeys) score += 30;
    if (lastUpdated && Date.now() - lastUpdated < 90 * 24 * 60 * 60 * 1000) score += 30; // Updated within 90 days
    return score;
  };

  const securityScore = getSecurityScore();
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Status
          <Badge variant={securityScore >= 80 ? "default" : securityScore >= 60 ? "secondary" : "destructive"}>
            {getScoreStatus(securityScore)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Current security posture and protection status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Score */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="font-medium">Security Score</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getScoreColor(securityScore)}`}>
              {securityScore}%
            </span>
          </div>
        </div>

        {/* Security Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Encryption Status */}
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className={`p-1 rounded ${encryptionEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium text-sm">Encryption</div>
              <div className="text-xs text-muted-foreground">
                {encryptionEnabled ? "AES-256 Active" : "Not Enabled"}
              </div>
            </div>
            {encryptionEnabled ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 ml-auto" />
            )}
          </div>

          {/* API Key Status */}
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className={`p-1 rounded ${hasApiKeys ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
              <Key className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium text-sm">API Keys</div>
              <div className="text-xs text-muted-foreground">
                {hasApiKeys ? "Configured" : "Not Set"}
              </div>
            </div>
            {hasApiKeys ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
            ) : (
              <Clock className="h-4 w-4 text-gray-600 ml-auto" />
            )}
          </div>
        </div>

        {/* Rate Limiting Info */}
        {rateLimitStatus && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Rate Limiting Active: {rateLimitStatus.remaining} operations remaining. 
              Resets in {Math.ceil((rateLimitStatus.resetTime - Date.now()) / 1000 / 60)} minutes.
            </AlertDescription>
          </Alert>
        )}

        {/* Security Recommendations */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full justify-between"
          >
            Security Recommendations
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          
          {showDetails && (
            <div className="space-y-2 text-sm">
              {securityScore < 100 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">Recommendations to improve security:</div>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        {!hasApiKeys && (
                          <li>Configure your own API keys for better control and privacy</li>
                        )}
                        {lastUpdated && Date.now() - lastUpdated > 90 * 24 * 60 * 60 * 1000 && (
                          <li>Consider rotating your API keys (last updated {Math.floor((Date.now() - lastUpdated) / 24 / 60 / 60 / 1000)} days ago)</li>
                        )}
                        <li>Enable audit logging to track API key usage</li>
                        <li>Review and update your security settings regularly</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-xs text-muted-foreground">
            Last security update: {new Date(lastUpdated).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 