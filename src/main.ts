/*
 * Copyright (c) 2016-2020  Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK.
 *
 *   This work is licensed under the
 *       Creative Commons Attribution 4.0 International License.
 *   To view a copy of this license, visit
 *       <https://creativecommons.org/licenses/by/4.0>.
 *   or send a letter to Creative Commons, PO Box 1866,
 *   Mountain View, CA 94042, USA.
 *
 */
/*
	https://www.bluetooth.com/wp-content/uploads/Sitecore-Media-Library/Gatt/Xml/Services/org.bluetooth.service.heart_rate.xml
	https://www.bluetooth.com/wp-content/uploads/Sitecore-Media-Library/Gatt/Xml/Services/org.bluetooth.service.generic_access.xml
	https://www.bluetooth.com/wp-content/uploads/Sitecore-Media-Library/Gatt/Xml/Services/org.bluetooth.service.battery_service.xml
	https://www.bluetooth.com/wp-content/uploads/Sitecore-Media-Library/Gatt/Xml/Characteristics/org.bluetooth.characteristic.heart_rate_measurement.xml
	https://www.bluetooth.com/wp-content/uploads/Sitecore-Media-Library/Gatt/Xml/Characteristics/org.bluetooth.characteristic.body_sensor_location.xml
 */

import BLEServer from 'bleserver'
import { uuid } from 'btutils'
import Timer from 'timer'

declare const global: any
declare const trace: any
declare const accelerometer: any

const HEART_RATE_SERVIE_UUID = uuid`180D`
const BATTERY_SERVICE_UUID = uuid`180F`

const RUN_STATUS = {
  FORWARD: 1,
  STOP: 0,
  BACK: 2,
}

const BUTTON_STATUS = {
  ON: 0,
  OFF: 1,
}

let runStatus = 0
let direction = 0
let buttonAStatus = BUTTON_STATUS.OFF
let buttonCStatus = BUTTON_STATUS.OFF

class HeartRateService extends BLEServer {
  bump: any
  timer: any
  bpm: any
  onReady() {
    this.deviceName = 'Moddable HRM'
    this.onDisconnected()
  }
  onConnected() {
    this.stopAdvertising()
  }
  onDisconnected() {
    this.stopMeasurements()
    this.startAdvertising({
      advertisingData: {
        flags: 6,
        completeName: this.deviceName,
        completeUUID16List: [HEART_RATE_SERVIE_UUID, BATTERY_SERVICE_UUID],
      },
    })
  }
  onCharacteristicNotifyEnabled(characteristic: any) {
    this.startMeasurements(characteristic)
  }
  onCharacteristicNotifyDisabled() {
    this.stopMeasurements()
  }
  startMeasurements(characteristic: any) {
    this.timer = Timer.repeat((id) => {
      this.bpm[0] = runStatus
      this.bpm[1] = direction
      this.notifyValue(characteristic, this.bpm)
    }, 100)
  }
  stopMeasurements() {
    if (this.timer) {
      Timer.clear(this.timer)
      delete this.timer
    }
    this.bpm = [0, 0] // flags, beats per minute
  }
}

const hrs = new HeartRateService()

accelerometer.onreading = function (values: { x: number; y: number; z: number }) {
  const { x } = values
  direction = Math.round(x * 100) + 100
  if (direction < 0) {
    direction = 0
  }
  if (direction > 200) {
    direction = 200
  }
}
accelerometer.start(17)

const updateRunStatus = () => {
  if (buttonAStatus === BUTTON_STATUS.ON) {
    runStatus = RUN_STATUS.FORWARD
  } else if (buttonCStatus === BUTTON_STATUS.ON) {
    runStatus = RUN_STATUS.BACK
  } else {
    runStatus = RUN_STATUS.STOP
  }
}

const buttonA = global.button.a
buttonA.onChanged = function () {
  buttonAStatus = this.read()
  trace(`runStatus: ${runStatus}, direction: ${direction}\n`)
  updateRunStatus()
}
const buttonC = global.button.c
buttonC.onChanged = function () {
  buttonCStatus = this.read()
  trace(`runStatus: ${runStatus}, direction: ${direction}\n`)
  updateRunStatus()
}
