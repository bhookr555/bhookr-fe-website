"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, CreditCard, Package } from "lucide-react";

export function SubscriptionManager() {
  // Mock subscription data
  const [subscription] = useState({
    id: "1",
    plan: "Weekly Plan",
    status: "active",
    startDate: "2024-12-01",
    nextBillingDate: "2024-12-22",
    amount: 1899,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "paused":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge variant={getStatusColor(subscription.status)}>
              {subscription.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{subscription.plan}</span>
            </div>
            <span className="text-xl font-bold">₹{subscription.amount}</span>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Start Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(subscription.startDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Next Billing</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(subscription.nextBillingDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1">
              Pause Subscription
            </Button>
            <Button variant="destructive" className="flex-1">
              Cancel Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((day) => (
              <div
                key={day}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">
                    {new Date(
                      Date.now() + day * 24 * 60 * 60 * 1000
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    1 meal delivery
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Skip
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "2024-12-15", amount: 1899, status: "Paid" },
              { date: "2024-12-08", amount: 1899, status: "Paid" },
              { date: "2024-12-01", amount: 1899, status: "Paid" },
            ].map((invoice, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">
                    {new Date(invoice.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ₹{invoice.amount}
                  </p>
                </div>
                <Badge variant="outline">{invoice.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
