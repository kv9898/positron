/**
 * Kallichore API
 * Kallichore is a Jupyter kernel gateway and supervisor
 *
 * The version of the OpenAPI document: 1.0.0
 * Contact: info@posit.co
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { RequestFile } from './models';

/**
* The status of the session
*/
export enum Status {
    Uninitialized = <any> 'uninitialized',
    Starting = <any> 'starting',
    Ready = <any> 'ready',
    Idle = <any> 'idle',
    Busy = <any> 'busy',
    Offline = <any> 'offline',
    Exited = <any> 'exited'
}