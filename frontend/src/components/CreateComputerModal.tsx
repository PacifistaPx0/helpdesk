import React, { useState } from 'react'
import { computersApi, type Computer } from '../services/api'

interface CreateComputerModalProps {
  isOpen: boolean
  onClose: () => void
  onComputerCreated?: (computer: Computer) => void
}

interface CreateComputerForm {
  hostname: string
  os: string
  os_version: string
  manufacturer: string
  model: string
  serial_number: string
  status: 'active' | 'inactive' | 'maintenance' | 'retired'
  cpu: string
  ram: string
  storage: string
  ip_address: string
  mac_address: string
  purchase_date: string
  warranty_expiry: string
  purchase_cost: number
  location: string
  notes: string
}

export function CreateComputerModal({ isOpen, onClose, onComputerCreated }: CreateComputerModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateComputerForm>({
    hostname: '',
    os: '',
    os_version: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    status: 'active',
    cpu: '',
    ram: '',
    storage: '',
    ip_address: '',
    mac_address: '',
    purchase_date: '',
    warranty_expiry: '',
    purchase_cost: 0,
    location: '',
    notes: ''
  })

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateComputerForm, string>>>({})

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        hostname: '',
        os: '',
        os_version: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        status: 'active',
        cpu: '',
        ram: '',
        storage: '',
        ip_address: '',
        mac_address: '',
        purchase_date: '',
        warranty_expiry: '',
        purchase_cost: 0,
        location: '',
        notes: ''
      })
      setFormErrors({})
      setError(null)
    }
  }, [isOpen])

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateComputerForm, string>> = {}

    if (!formData.hostname.trim()) {
      errors.hostname = 'Hostname is required'
    }

    if (!formData.os.trim()) {
      errors.os = 'Operating System is required'
    }

    if (!formData.manufacturer.trim()) {
      errors.manufacturer = 'Manufacturer is required'
    }

    if (!formData.model.trim()) {
      errors.model = 'Model is required'
    }

    if (!formData.serial_number.trim()) {
      errors.serial_number = 'Serial number is required'
    }

    if (!formData.location.trim()) {
      errors.location = 'Location is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof CreateComputerForm, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Format dates to RFC3339/ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
      const formatDate = (dateStr: string) => {
        if (!dateStr) return undefined
        return `${dateStr}T00:00:00Z`
      }

      const newComputer = await computersApi.createComputer({
        hostname: formData.hostname.trim(),
        os: formData.os.trim(),
        os_version: formData.os_version.trim() || undefined,
        manufacturer: formData.manufacturer.trim(),
        model: formData.model.trim(),
        serial_number: formData.serial_number.trim(),
        status: formData.status,
        cpu: formData.cpu.trim() || undefined,
        ram: formData.ram.trim() || undefined,
        storage: formData.storage.trim() || undefined,
        ip_address: formData.ip_address.trim() || undefined,
        mac_address: formData.mac_address.trim() || undefined,
        purchase_date: formatDate(formData.purchase_date),
        warranty_expiry: formatDate(formData.warranty_expiry),
        purchase_cost: formData.purchase_cost,
        location: formData.location.trim(),
        notes: formData.notes.trim() || undefined
      } as any)

      if (onComputerCreated) {
        onComputerCreated(newComputer)
      }

      onClose()
    } catch (err: any) {
      console.error('Failed to create computer:', err)
      setError(err.message || 'Failed to create computer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'retired': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-opacity-20 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ 
        zIndex: 9999,
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)'
      }}
      onClick={onClose}
    >
      <div 
        className="bg-gray-200 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Register New Computer</h3>
                <p className="text-sm text-gray-500">Add a new computer asset to inventory</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              disabled={loading}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hostname */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hostname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.hostname}
                    onChange={(e) => handleInputChange('hostname', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.hostname ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., DESKTOP-001"
                    disabled={loading}
                  />
                  {formErrors.hostname && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.hostname}</p>
                  )}
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => handleInputChange('serial_number', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.serial_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., SN123456789"
                    disabled={loading}
                  />
                  {formErrors.serial_number && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.serial_number}</p>
                  )}
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.manufacturer ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Dell, HP, Lenovo"
                    disabled={loading}
                  />
                  {formErrors.manufacturer && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.manufacturer}</p>
                  )}
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.model ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., OptiPlex 7090"
                    disabled={loading}
                  />
                  {formErrors.model && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.model}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(formData.status)}`}>
                      {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.location ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Office 101, Floor 3"
                    disabled={loading}
                  />
                  {formErrors.location && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.location}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Operating System */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Operating System</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OS <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.os}
                    onChange={(e) => handleInputChange('os', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.os ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Windows, macOS, Linux"
                    disabled={loading}
                  />
                  {formErrors.os && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.os}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OS Version
                  </label>
                  <input
                    type="text"
                    value={formData.os_version}
                    onChange={(e) => handleInputChange('os_version', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 11 Pro, Ventura 13.2"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Hardware Specifications */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Hardware Specifications</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPU</label>
                  <input
                    type="text"
                    value={formData.cpu}
                    onChange={(e) => handleInputChange('cpu', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Intel i7-11700"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RAM</label>
                  <input
                    type="text"
                    value={formData.ram}
                    onChange={(e) => handleInputChange('ram', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 16GB DDR4"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage</label>
                  <input
                    type="text"
                    value={formData.storage}
                    onChange={(e) => handleInputChange('storage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 512GB SSD"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Network Information */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Network Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                  <input
                    type="text"
                    value={formData.ip_address}
                    onChange={(e) => handleInputChange('ip_address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 192.168.1.100"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
                  <input
                    type="text"
                    value={formData.mac_address}
                    onChange={(e) => handleInputChange('mac_address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 00:1B:44:11:3A:B7"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Purchase Information */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Purchase Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
                  <input
                    type="date"
                    value={formData.warranty_expiry}
                    onChange={(e) => handleInputChange('warranty_expiry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchase_cost}
                    onChange={(e) => handleInputChange('purchase_cost', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes or comments about this computer..."
                disabled={loading}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Register Computer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
