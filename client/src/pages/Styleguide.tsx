import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Edit2, Trash2, Eye, Download, Upload, 
  Check, X, AlertTriangle, Info, Settings,
  Building2, Users, TrendingUp, Calendar
} from "lucide-react";

export default function Styleguide() {
  const [inputValue, setInputValue] = useState("");
  const [isToggled, setIsToggled] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Header title="PAG Style Guide" />
      
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        
        {/* Brand Identity */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Brand Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <CardHeader>
                <CardTitle style={{ color: 'var(--color-text)' }}>Logo Variants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-md" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <img src="/assets/pag-logo-light.svg" alt="PAG Logo Light" className="h-8 mb-2" />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Light variant (on dark backgrounds)</p>
                </div>
                <div className="p-4 rounded-md" style={{ backgroundColor: 'var(--color-primary)' }}>
                  <img src="/assets/pag-logo.svg" alt="PAG Logo" className="h-8 mb-2" />
                  <p className="text-sm" style={{ color: 'var(--color-on-primary)' }}>Default variant (on light backgrounds)</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <CardHeader>
                <CardTitle style={{ color: 'var(--color-text)' }}>Color Palette</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>Primary</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>#E7D7C8</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md" style={{ backgroundColor: 'var(--color-bg)' }}></div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>Background</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>#423731</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md" style={{ backgroundColor: 'var(--color-surface)' }}></div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>Surface</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>#53453E</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Typography</h2>
          <Card className="card" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <CardContent className="p-6 space-y-4">
              <div>
                <h1 style={{ color: 'var(--color-text)' }}>Heading 1 - Jost Bold 32px</h1>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Used for main page titles</p>
              </div>
              <div>
                <h2 style={{ color: 'var(--color-text)' }}>Heading 2 - Jost Semibold 24px</h2>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Used for section headers</p>
              </div>
              <div>
                <h3 style={{ color: 'var(--color-text)' }}>Heading 3 - Jost Semibold 20px</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Used for subsection headers</p>
              </div>
              <div>
                <p style={{ color: 'var(--color-text)' }}>Body text - Jost Regular 16px</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Used for regular content</p>
              </div>
              <div>
                <small style={{ color: 'var(--color-text-muted)' }}>Small text - Jost Regular 14px</small>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Used for captions and secondary info</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Buttons</h2>
          <Card className="card" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 style={{ color: 'var(--color-text)' }}>Primary Buttons</h4>
                  <div className="space-y-2">
                    <Button 
                      className="btn-primary"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Primary Action
                    </Button>
                    <Button 
                      className="btn-primary"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', opacity: 0.6 }}
                      disabled
                    >
                      Disabled State
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 style={{ color: 'var(--color-text)' }}>Secondary Buttons</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline"
                      className="btn-secondary"
                      style={{ 
                        backgroundColor: 'transparent', 
                        border: '1px solid var(--color-border)', 
                        color: 'var(--color-text)' 
                      }}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Secondary Action
                    </Button>
                    <Button 
                      variant="ghost"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Ghost Button
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Form Elements */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Form Elements</h2>
          <Card className="card" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label style={{ color: 'var(--color-text)' }}>Input Field</Label>
                <Input
                  placeholder="Enter text here..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="input mt-1"
                  style={{ 
                    backgroundColor: 'var(--color-surface)', 
                    border: '1px solid var(--color-border)', 
                    color: 'var(--color-text)' 
                  }}
                />
              </div>
              <div>
                <Label style={{ color: 'var(--color-text)' }}>Focused State</Label>
                <Input
                  placeholder="This input is focused"
                  className="input mt-1"
                  style={{ 
                    backgroundColor: 'var(--color-surface)', 
                    border: '1px solid var(--color-primary)', 
                    color: 'var(--color-text)',
                    boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent)'
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Status Indicators */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Status Indicators</h2>
          <Card className="card" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Badge className="status-success">
                    <Check className="mr-1 h-3 w-3" />
                    Success
                  </Badge>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Completed actions, active status
                  </p>
                </div>
                <div className="space-y-2">
                  <Badge className="status-warning">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Warning
                  </Badge>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Pending actions, attention needed
                  </p>
                </div>
                <div className="space-y-2">
                  <Badge className="status-danger">
                    <X className="mr-1 h-3 w-3" />
                    Error
                  </Badge>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Failed actions, inactive status
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cards & Data Display */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Cards & Data Display</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Building2 className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                  Project Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)' }}>Active Projects</span>
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>12</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)' }}>Total Revenue</span>
                    <span className="font-semibold" style={{ color: 'var(--color-success)' }}>245,000 AED</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)' }}>Total Expenses</span>
                    <span className="font-semibold" style={{ color: 'var(--color-danger)' }}>178,500 AED</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <TrendingUp className="h-5 w-5" style={{ color: 'var(--color-success)' }} />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--color-text-muted)' }}>Profit Margin</span>
                    <Badge className="status-success">+27.2%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--color-text-muted)' }}>Projects On Time</span>
                    <Badge className="status-success">85%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ color: 'var(--color-text-muted)' }}>Client Satisfaction</span>
                    <Badge className="status-warning">Pending</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Table Example */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Table Styling</h2>
          <Card className="card" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface-muted)' }}>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        Project
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        Budget
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="table-row border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>Villa Renovation</td>
                      <td className="px-4 py-3">
                        <Badge className="status-success">Active</Badge>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text)' }}>125,000 AED</td>
                    </tr>
                    <tr className="table-row border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>Office Complex</td>
                      <td className="px-4 py-3">
                        <Badge className="status-warning">Pending</Badge>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text)' }}>340,000 AED</td>
                    </tr>
                    <tr className="table-row border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>Residential Tower</td>
                      <td className="px-4 py-3">
                        <Badge className="status-danger">Delayed</Badge>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text)' }}>875,000 AED</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Accessibility Notes */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Accessibility & Guidelines</h2>
          <Card className="card" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Contrast Ratios</h4>
                  <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <li>• Text on background: WCAG AA compliant</li>
                    <li>• Interactive elements: Clear focus states</li>
                    <li>• Status colors: High contrast ratios</li>
                    <li>• Touch targets: Minimum 44×44px</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Usage Guidelines</h4>
                  <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <li>• Use design tokens consistently</li>
                    <li>• Maintain visual hierarchy</li>
                    <li>• Apply proper hover/focus states</li>
                    <li>• Test on mobile devices</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}