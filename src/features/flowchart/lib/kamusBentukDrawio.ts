/**
 * KAMUS NAMA BENTUK draw.io YANG NYATA — bukan karangan, bukan tebakan.
 *
 * Diambil 15 Okt dari definisi pustaka draw.io sendiri (cabang `dev`
 * jgraph/drawio): `js/grapheditor/Sidebar.js` untuk pustaka General/UML dan
 * `js/diagramly/sidebar/Sidebar-*.js` untuk Flowchart, Basic, BPMN, ER,
 * Arrows2, Mockup, Electrical, LeanMapping, Network, Azure, Azure2, AWS4,
 * UML25, dan Infographic. Berkas-berkas itu DIJALANKAN, lalu setiap
 * `style=` yang benar-benar mereka hasilkan dicatat — 2.900 gaya, 1.311 nilai
 * `shape=` ber-namespace. Ditambah 115 nama telanjang: yang terdaftar di
 * perender (`mxCellRenderer.registerShape("...")`, 98 nama), yang didaftarkan
 * lewat `mxConstants.SHAPE_*` (ellipse, rhombus, swimlane, image, dst.), dan
 * yang muncul di sidebar. Total 1.426 nama.
 *
 * KEGUNAANNYA: berkas ini adalah PENYEBUT. Tanpa dia, kalimat "sudah 80% mirip
 * draw.io" tidak bisa diukur — dan versi pertama peta #752 membuktikan
 * bahayanya: 206 dari 248 kunci `PETA_SHAPE` ternyata nama yang tidak pernah
 * ada di draw.io, jadi angka cakupan yang dihasilkannya mengukur karangannya
 * sendiri, bukan kenyataan.
 *
 * Dua test membacanya:
 *  - penjaga anti-karangan: tidak ada kunci peta di luar kamus ini;
 *  - kartu skor cakupan: berapa bagian kamus ini yang benar-benar terpetakan.
 *
 * BATAS YANG DISADARI, bukan disembunyikan: penyebutnya adalah bentuk yang
 * BISA DIPILIH pengguna di antarmuka draw.io, bukan seluruh stensil yang
 * terdaftar (registry penuh memuat ~3.100 nama, termasuk pustaka yang tidak
 * pernah muncul di sidebar). Pilihan itu sengaja — yang diukur di sini adalah
 * "apa yang ditemui orang saat membuat diagram", dan penjaga anti-karangan
 * tetap ketat: nama sah yang belum ada di sini harus ditambahkan DULU, dengan
 * bukti dari sumber draw.io, sebelum boleh dipetakan.
 *
 * Jangan menambah nama ke sini tanpa bukti dari sumber draw.io.
 */

/** Nilai `shape=` telanjang (tanpa namespace). */
export const BENTUK_BARE_DRAWIO: readonly string[] = `
  actor arrow arrowconnector associativeentity callout card cloud collate component connector
  corner cross crossbar cube curlybracket curvedtext cylinder cylinder2 cylinder3 datastorage
  datastore delay dimension display document doublearrow doubleellipse ellipse endstate ext
  fillededge flexarrow folder gitcherrypick gitmergecommit gittag hexagon image
  internalstorage ishikawahead isocube isocube2 isorectangle label line lineellipse link
  lollipop looplimit manualinput mermaidblockarrow mermaidodd mermaidperson mermaidsankeylink
  mermaidusecaseactor message mindmapbang module note note2 offpageconnector or orellipse
  parallelmarker parallelogram partialrectangle pipe plus process process2
  providedrequiredinterface rect rectangle requiredinterface requires rhombus seqactorstick
  seqboundary seqcollections seqcontrol seqdatabase seqentity seqqueue singlearrow smileyface
  sortshape startstate step sumellipse swimlane switch table tableline tablerow tape tapedata
  taperedarrow tee text transparent trapezoid triangle umlactor umlboundary umlcontrol
  umldestroy umlentity umlframe umllifeline umlstate waypoint wedgecallout wire xor zigzag
`
  .split(/\s+/)
  .filter(Boolean);

/**
 * Sufiks per pustaka ber-namespace. `mxgraph.mockup.buttons.button` disimpan
 * sebagai pustaka `mxgraph.mockup` + sufiks `buttons.button`.
 */
export const BENTUK_PUSTAKA_DRAWIO: Readonly<Record<string, readonly string[]>> = {
  "mxgraph.arrows2": `
    arrow bendarrow benddoublearrow calloutarrow calloutdouble90arrow calloutdoublearrow
    calloutquadarrow jumpinarrow quadarrow sharparrow sharparrow2 stripedarrow stylisedarrow
    tailedarrow tailednotchedarrow triadarrow twowayarrow uturnarrow wedgearrow
    wedgearrowdashed2
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.aws4": `
    a1_instance access_analyzer action actuator ad_connector addon agent agent2 alarm alert
    alexa_enabled_device_2 alexa_skill alexa_voice_service_2 all_products ami
    amplify_aws_amplify_studio application
    application_discovery_service_aws_agentless_collector
    application_discovery_service_aws_discovery_agent
    application_discovery_service_migration_evaluator_collector application_load_balancer
    archive athena_data_source_connectors attribute attributes aurora_instance
    aurora_instance_alt authenticated_user auto_scaling2 automation
    aws_backup_for_aws_cloudformation aws_backup_legal_hold
    aws_backup_support_for_amazon_fsx_for_netapp_ontap aws_backup_vault_lock
    aws_glue_data_quality aws_glue_for_ray aws_managed_microsoft_ad backup_audit_manager
    backup_aws_backup_support_for_amazon_s3 backup_aws_backup_support_for_vmware_workloads
    backup_compliance_reporting backup_compute backup_database backup_gateway backup_plan
    backup_recovery_point_objective backup_recovery_time_objective backup_restore
    backup_storage backup_vault backup_virtual_machine backup_virtual_machine_monitor bank
    bicycle blockchain_resource braket_chandelier braket_chip braket_embedded_simulator
    braket_managed_simulator braket_noise_simulator braket_qpu braket_simulator
    braket_simulator_1 braket_simulator_2 braket_simulator_3 braket_simulator_4
    braket_state_vector braket_tensor_network bucket bucket_with_objects c4_instance
    c5_instance c5a c5ad c5d c5n_instance c6g_instance c6gd cache_node cached_volume camera
    camera2 car cart certificate_manager certificate_manager_2 change_set chat checklist
    checklist_cost checklist_fault_tolerant checklist_performance checklist_security
    classic_load_balancer client cloud9 cloud_digital_interface cloud_extension_ros
    cloud_wan_core_network_edge cloud_wan_segment_network
    cloud_wan_transit_gateway_route_table_attachment cloud_wan_virtual_pop cloudfront_functions
    cloudtrail_cloudtrail_lake cloudwatch_cross_account_observability
    cloudwatch_data_protection cloudwatch_evidently cloudwatch_logs cloudwatch_metrics_insights
    cloudwatch_rum cloudwatch_synthetics cluster coffee_pot cold_storage connector container_1
    container_2 container_3 container_registry_image corporate_data_center credentials
    customer_gateway d2_instance d3_instance d3en_instance data_encryption_key
    data_exchange_for_apis data_lake_resource_icon data_set data_stream data_table
    database_migration_workflow_job datasync_discovery datazone_business_data_catalog
    datazone_data_portal datazone_data_projects db_on_instance2 dense_compute_node
    dense_storage_node deployment deployments desired_state development_environment
    devops_guru_insights disk document documentdb_elastic_clusters documents documents2
    documents3 door_lock download_distribution dynamodb_dax
    dynamodb_standard_access_table_class dynamodb_standard_infrequent_access_table_class
    dynamodb_stream ec2_aws_microservice_extractor_for_net ec2_c6a_instance ec2_c6gn_instance
    ec2_c6i_instance ec2_c6in_instance ec2_c7g_instance ec2_c7gn_instance ec2_dl1_instance
    ec2_g5_instance ec2_g5g_instance ec2_hpc6a_instance ec2_hpc6id_instance ec2_i4i_instance
    ec2_im4gn_instance ec2_inf2_instance ec2_is4gen_instance ec2_m1_mac_instance
    ec2_m6a_instance ec2_m6i_instance ec2_m6idn_instance ec2_m6in_instance ec2_p4de_instance
    ec2_r6a_instance ec2_r6i_instance ec2_r6idn_instance ec2_r6in_instance ec2_r7iz_instance
    ec2_trn1_instance ec2_vt1_instance ec2_x2gd_instance ec2_x2idn_instance ec2_x2iedn_instance
    ec2_x2iezn_instance echo ecs_anywhere ecs_copilot_cli ecs_service ecs_service_connect
    ecs_task edge_location eks_on_outposts elastic_block_store_amazon_data_lifecycle_manager
    elastic_block_store_volume_gp3 elastic_file_system_elastic_throughput
    elastic_file_system_infrequent_access elastic_file_system_intelligent_tiering
    elastic_file_system_one_zone elastic_file_system_one_zone_infrequent_access
    elastic_file_system_standard elastic_ip_address elastic_network_adapter
    elastic_network_interface elasticache_for_memcached elasticache_for_redis
    elasticache_for_valkey email email_2 email_notification emr_engine emr_engine_mapr_m3
    emr_engine_mapr_m5 emr_engine_mapr_m7 encrypted_data endpoint endpoints event
    event_event_based event_resource event_time_based eventbridge_custom_event_bus_resource
    eventbridge_default_event_bus_resource eventbridge_pipes
    eventbridge_saas_partner_event_bus_resource eventbridge_scheduler eventbridge_schema
    eventbridge_schema_registry external_sdk external_toolkit f1_instance factory
    file_cache_hybrid_nfs_linked_datasets file_cache_on_premises_nfs_linked_datasets
    file_cache_s3_linked_datasets file_gateway file_system filtering_rule finding firetv
    firetv_stick fleet_management flow_logs folder folders forums fsx_file_gateway g3_instance
    g4ad_instance g4dn gateway gateway_load_balancer gear general_access_points generic
    generic_application generic_database generic_firewall git_repository glacier
    glacier_deep_archive global_secondary_index globe glue_crawlers glue_data_catalog
    glue_databrew group groupcenter h1_instance habana_gaudi hardware_board hdfs_cluster
    high_memory_instance hosted_zone house http2_protocol http_notification http_protocol i2
    i3_instance i3en identity_access_management_iam_roles_anywhere import_export inf1
    inferentia instance2 instance_with_cloudwatch2 instances instances_2 intelligent_tiering
    internet internet_alt1 internet_alt2 internet_alt22 internet_gateway inventory
    iot_analytics_channel iot_analytics_data_store iot_analytics_pipeline iot_certificate
    iot_core_device_advisor iot_core_device_location iot_device_gateway
    iot_device_jobs_resource iot_device_management_fleet iot_device_tester
    iot_greengrass_artifact iot_greengrass_component iot_greengrass_component_machine_learning
    iot_greengrass_component_nucleus iot_greengrass_component_private
    iot_greengrass_component_public iot_greengrass_interprocess_communication
    iot_greengrass_protocol iot_greengrass_recipe iot_greengrass_stream_manager
    iot_lorawan_protocol iot_over_the_air_update iot_sailboat iot_sitewise_asset
    iot_sitewise_asset_hierarchy iot_sitewise_asset_model iot_sitewise_asset_properties
    iot_sitewise_data_streams iot_thing_freertos_device iot_thing_humidity_sensor
    iot_thing_industrial_pc iot_thing_plc iot_thing_relay iot_thing_stacklight
    iot_thing_temperature_humidity_sensor iot_thing_temperature_sensor
    iot_thing_temperature_vibration_sensor iot_thing_vibration_sensor item items json_script
    key_management_service_external_key_store lambda_function layers
    license_manager_application_discovery license_manager_license_blending lightbulb
    location_service_geofence location_service_map location_service_place
    location_service_routes location_service_track logs long_term_security_credential
    m4_instance m5_instance m5a_instance m5d_instance m5dn_instance m5n_instance m5zn_instance
    m6g_instance m6gd_instance mac_instance magnifying_glass_2 mainframe_modernization_analyzer
    mainframe_modernization_compiler mainframe_modernization_converter
    mainframe_modernization_developer mainframe_modernization_runtime maintenance_windows
    managed_ms_ad management_console2 marketplace mediaconnect_gateway medical_emergency mesh
    message metrics mfa_token migration_hub_refactor_spaces_applications
    migration_hub_refactor_spaces_environments migration_hub_refactor_spaces_services
    mobile_client monitoring mq_broker mqtt_protocol msk_amazon_msk_connect multimedia
    multiple_volumes_resource namespace nat_gateway network_access_control_list
    network_firewall_endpoints network_load_balancer non_cached_volume notebook object
    office_building one_zone_ia opensearch_dashboards opensearch_ingestion
    opensearch_observability opensearch_service_cluster_administrator_node
    opensearch_service_data_node opensearch_service_index opensearch_service_traces
    opensearch_service_ultrawarm_node opsworks_apps opsworks_permissions optimized_instance
    organizations_account organizations_account2 organizations_management_account
    organizations_management_account2 organizations_organizational_unit
    organizations_organizational_unit2 p2_instance p3_instance p3dn_instance p4_instance
    p4d_instance parameter_store patch_manager peering permissions pinpoint_journey
    police_emergency policy programming_language question queue quicksight_paginated_reports
    r4_instance r5_instance r5a_instance r5ad_instance r5b_instance r5d_instance r5gd_instance
    r5n_instance r6g_instance rdn_instance rds_blue_green_deployments rds_instance
    rds_instance_alt rds_mariadb_instance rds_mariadb_instance_alt rds_multi_az
    rds_multi_az_db_cluster rds_mysql_instance rds_mysql_instance_alt rds_optimized_writes
    rds_oracle_instance rds_oracle_instance_alt rds_piops rds_postgresql_instance
    rds_postgresql_instance_alt rds_proxy rds_proxy_alt rds_sql_server_instance
    rds_sql_server_instance_alt rds_trusted_language_extensions_for_postgresql recover
    redshift_auto_copy redshift_data_sharing_governance redshift_ml
    redshift_query_editor_v20_light redshift_ra3 redshift_streaming_ingestion registry
    rekognition_image rekognition_video replication replication_time_control reported_state
    rescue resource resourceicon resources role route_53_application_recovery_controller
    route_53_readiness_checks route_53_resolver route_53_resolver_dns_firewall
    route_53_resolver_query_logging route_53_routing_controls route_table router rule rule_2
    rule_3 run_command s3_batch_operations s3_express_one_zone s3_file_gateway s3_files
    s3_multi_region_access_points s3_object_lambda s3_object_lambda_access_points
    s3_object_lock s3_on_outposts s3_select s3_storage_lens s3_tables s3_vectors
    sagemaker_canvas sagemaker_geospatial_ml sagemaker_model sagemaker_notebook
    sagemaker_shadow_testing sagemaker_train saml_token search_documents sensor servers service
    servo shadow shield2 shield_shield_advanced simple_ad
    simple_storage_service_directory_bucket simple_storage_service_s3_glacier_instant_retrieval
    simulation simulator snapshot source_code spot_instance ssl_padlock stack stack2
    standard_ia state_manager streaming_distribution sts sts_alternate
    systems_manager_application_manager systems_manager_change_calendar
    systems_manager_change_manager systems_manager_compliance systems_manager_distributor
    systems_manager_incident_manager systems_manager_opscenter systems_manager_session_manager
    t2_instance t3_instance t3a_instance t4g_instance table tape_gateway tape_storage template
    temporary_security_credential textract_analyze_lending thermostat topic topic_2
    traditional_server trainium_instance transfer_family_aws_as2 transfer_for_ftp_resource
    transfer_for_ftps_resource transfer_for_sftp_resource transit_gateway_attachment travel
    user users utility vault virtual_gateway virtual_node virtual_router virtual_service
    virtual_tape_library volume volume_gateway vpc_access_points vpc_carrier_gateway
    vpc_network_access_analyzer vpc_reachability_analyzer vpc_traffic_mirroring
    vpc_virtual_private_cloud_vpc vpn_connection vpn_gateway waf_bad_bot waf_bot
    waf_bot_control waf_labels waf_managed_rule waf_rule windfarm
    workspaces_family_amazon_workspaces workspaces_family_amazon_workspaces_core
    workspaces_workspaces_web x1_instance2 x1e_instance z1d_instance
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.azure": `
    access_control automation autoscale azure_active_directory azure_alert azure_cache
    azure_instance azure_load_balancer azure_marketplace azure_sdk azure_subscription
    azure_website backup_service bitbucket_code_source biztalk_services certificate cloud
    cloud_service cloud_service_package_file cloud_services_configuration_file code_file
    codeplex_code_source computer content_delivery_network database dropbox_code_source
    enterprise express_route file file_2 git_repository github_code hdinsight health_monitoring
    healthy hyper_v_recovery_manager laptop load_balancer_generic media_service message mobile
    mobile_services multi_factor_authentication mysql_database notification_hub
    notification_topic operating_system_image powershell_file queue_generic rdp_remoting_file
    scheduler_2 script_file server server_rack service_bus service_bus_queues service_bus_relay
    service_bus_topics_and_subscriptions service_endpoint sql_database sql_database_sql_azure
    sql_datasync sql_reporting startup_task storage storage_blob storage_queue storage_table
    storsimple tablet team_foundation_service traffic_manager unidentified_code_object user vhd
    vhd_data_disk virtual_machine virtual_machine_feature virtual_network visual_studio_online
    wadcfg_diagnostics_file web_role web_roles website_generic worker_role worker_roles
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.basic": `
    4_point_star_2 6_point_star 8_point_star acute_triangle arc banner button cloud_callout
    cloud_rect cone cone2 corner_round_rect diag_round_rect diag_snip_rect diag_stripe document
    donut drop flash frame frame_corner half_circle heart isocube layered_rect loud_callout
    moon no_symbol obtuse_triangle octagon2 orthogonal_triangle oval_callout partconcellipse
    patternfillrect pentagon pie plaque plaque_frame pointed_oval polygon pyramid rect
    rectcallout rounded_frame roundrectcallout shaded_button smiley star sun
    three_corner_round_rect tick wave2 x
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.bpmn": `
    conversation2 data2 event gateway2 swimlane task2
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.electrical": `
    abstract.amplifier abstract.controlled_amplifier abstract.dac abstract.delta
    abstract.filter abstract.function abstract.integrator abstract.multiplier abstract.mux2
    abstract.operational_amp_1 abstract.operational_amp_2 abstract.ota_1 abstract.ota_2
    abstract.ota_3 abstract.quantizer abstract.sum abstract.summation_point
    abstract.thermistor_with_independent_integral_heater abstract.voltage_regulator
    capacitors.capacitor_1 capacitors.capacitor_2 capacitors.capacitor_3 capacitors.capacitor_4
    capacitors.capacitor_5 capacitors.capacitor_6 capacitors.differential_capacitor
    capacitors.feed_through_capacitor capacitors.ganged_capacitor capacitors.multiple_capacitor
    capacitors.multiple_electrolytic_capacitor_comm_neg
    capacitors.multiple_electrolytic_capacitor_comm_pos capacitors.trimmer_capacitor_1
    capacitors.trimmer_capacitor_2 capacitors.variable_capacitor_1
    capacitors.variable_capacitor_2 diodes.diode diodes.field_effect_diode
    diodes.four_layer_diode diodes.gunn_diode diodes.schottky_diode diodes.transorb_1
    diodes.transorb_2 diodes.tunnel_diode diodes.tunnel_diode_2 diodes.varactor_-_varicap
    diodes.zener_diode_1 diodes.zener_diode_2 diodes.zener_diode_3 electro-mechanical.bell
    electro-mechanical.break_contact electro-mechanical.buzzer
    electro-mechanical.changeovercontactswitch2 electro-mechanical.circuitbreaker2
    electro-mechanical.dpdt3 electro-mechanical.dpst2 electro-mechanical.flowactuatedswitch
    electro-mechanical.fourpositionswitch2 electro-mechanical.fuse2
    electro-mechanical.gasflowactuatedswitch electro-mechanical.inertiaswitch2
    electro-mechanical.isolatorswitch2 electro-mechanical.limitswitch
    electro-mechanical.limitswitch2 electro-mechanical.liquidlevelactuatedswitch
    electro-mechanical.liquidlevelactuatedswitch2 electro-mechanical.loudspeaker
    electro-mechanical.make_contact electro-mechanical.manualswitch2
    electro-mechanical.mercury_switch electro-mechanical.mercury_switch_2
    electro-mechanical.motor_2 electro-mechanical.passingmakecontact2
    electro-mechanical.piezo_sounder electro-mechanical.pilot_light
    electro-mechanical.pressureactuatedswitch electro-mechanical.proximitylimitswitch2
    electro-mechanical.pushbutton electro-mechanical.pushbuttonbreak2
    electro-mechanical.pushbuttonmakeswitch2 electro-mechanical.pushbuttontwocircuitswitch2
    electro-mechanical.reedswitch2 electro-mechanical.relay electro-mechanical.relay_coil
    electro-mechanical.relay_coil_2 electro-mechanical.relay_contacts
    electro-mechanical.resonator electro-mechanical.safetyinterlockswitch
    electro-mechanical.selectorswitch3position2 electro-mechanical.selectorswitch4position2
    electro-mechanical.selectorswitch6position2 electro-mechanical.shortingselectorswitch2
    electro-mechanical.singleswitch electro-mechanical.springreturn3
    electro-mechanical.stay_put electro-mechanical.switchdisconnector
    electro-mechanical.temperatureactuatedswitch electro-mechanical.temperatureswitch
    electro-mechanical.thermostat2 electro-mechanical.threepositionswitch2
    electro-mechanical.timedelayswitch electro-mechanical.timedelayswitch2
    electro-mechanical.twopositionswitch2 electro-mechanical.twowaycontact2
    electro-mechanical.twowayswitch iec_logic_gates.and iec_logic_gates.nand_2
    iec_logic_gates.nor_2 iec_logic_gates.not_2 iec_logic_gates.or iec_logic_gates.xor
    inductors.1_phase_induction_volt_reg inductors.adjustable_transformer inductors.choke
    inductors.coaxial_choke inductors.current_transformer_1 inductors.current_transformer_2
    inductors.current_transformer_3 inductors.ferrite_core inductors.half_inductor
    inductors.induction_voltage_regulator inductors.inductor inductors.inductor_1
    inductors.inductor_3 inductors.inductor_5 inductors.iron_core inductors.linear_coupler
    inductors.magnetic_core inductors.outdoor_metering_device inductors.pot_trans_3_windings
    inductors.potential_transformer inductors.potential_transformer_2
    inductors.saturating_transformer inductors.transductor inductors.transformer
    inductors.transformer_1 inductors.transformer_2 inductors.triplex_induction_volt_reg
    inductors.variable_inductor inductors.variometer instruments.galvanometer
    instruments.oscilloscope instruments.signal_generator logic_gates.bandpass_filter
    logic_gates.buffer2 logic_gates.d_type_flip-flop logic_gates.d_type_flip-flop_with_clear_2
    logic_gates.d_type_rs_flip-flop logic_gates.dual_inline_ic logic_gates.highpass_filter
    logic_gates.inverter_2 logic_gates.inverting_contact logic_gates.jk_flip-flop
    logic_gates.jk_flip-flop_with_clear_2 logic_gates.jk_flip-flop_with_sr
    logic_gates.logic_gate logic_gates.lowpass_filter logic_gates.qfp_ic logic_gates.rs_latch
    logic_gates.schmitt_trigger logic_gates.synchronous_rs_latch logic_gates.t_type_flip-flop
    miscellaneous.2_conductor_jack miscellaneous.2_conductor_plug
    miscellaneous.3_conductor_jack miscellaneous.3_conductor_plug miscellaneous.ac_out
    miscellaneous.adapter miscellaneous.batterystack miscellaneous.c_header_connector
    miscellaneous.cable_termination miscellaneous.chassis miscellaneous.circuit_breaker
    miscellaneous.co-ax miscellaneous.coaxial_center_conductor miscellaneous.coaxial_jack_plug
    miscellaneous.coaxial_outside_conductor miscellaneous.crystal_1 miscellaneous.delay_element
    miscellaneous.f_m_2_conductor_1 miscellaneous.f_m_2_conductor_2
    miscellaneous.f_m_2_conductor_3 miscellaneous.f_m_3_conductor_1
    miscellaneous.f_m_3_conductor_2 miscellaneous.f_m_3_conductor_3
    miscellaneous.f_m_3_conductor_4 miscellaneous.f_m_3_conductor_5
    miscellaneous.flourescent_lamp miscellaneous.fuse_1 miscellaneous.fuse_2
    miscellaneous.fuse_3 miscellaneous.fuse_4 miscellaneous.generic_component
    miscellaneous.igniter_plug2 miscellaneous.illuminating_bulb miscellaneous.indicator
    miscellaneous.large_d_connector miscellaneous.light_bulb miscellaneous.loop_antenna
    miscellaneous.mf_contact_2 miscellaneous.monocell_battery
    miscellaneous.multicell_battery_tapped miscellaneous.neon_lamp_2
    miscellaneous.normalled_jack2 miscellaneous.normalled_jacks2 miscellaneous.permanent_magnet
    miscellaneous.plug_socket_connection miscellaneous.sensing_link_squib
    miscellaneous.shielded_jack_plug miscellaneous.small_d_connector
    miscellaneous.squib_ignitor miscellaneous.surge_protector miscellaneous.surge_protector_2
    miscellaneous.terminal_board miscellaneous.thermal_element miscellaneous.thermocouple
    miscellaneous.thermopile miscellaneous.transducer miscellaneous.transducer_2
    mosfets1.dual_gate_mosfet_n mosfets1.dual_gate_mosfet_p mosfets1.mosfet_ic_n
    mosfets1.mosfet_ic_n_body_diode mosfets1.mosfet_ic_p mosfets1.mosfet_ic_p_body_diode
    mosfets1.mosfet_n_no_bulk mosfets1.mosfet_p_no_bulk mosfets1.n-channel_mosfet_1
    mosfets1.p-channel_mosfet_1 opto_electronics.7_segment_display
    opto_electronics.7_segment_display_with_dp opto_electronics.9_segment_display
    opto_electronics.9_segment_display_with_dp opto_electronics.lamp opto_electronics.led_1
    opto_electronics.led_2 opto_electronics.light-activated_scr opto_electronics.opto-coupler
    opto_electronics.opto-transistor opto_electronics.photo_resistor_1
    opto_electronics.photo_resistor_2 opto_electronics.photo_resistor_3
    opto_electronics.photodiode opto_electronics.solar_cell plc_ladder.contact
    plc_ladder.not_contact plc_ladder.not_output_1 plc_ladder.not_output_2 plc_ladder.output_1
    plc_ladder.output_2 radio.aerial_-_antenna_1 radio.aerial_-_antenna_2 radio.buzzer
    radio.dipole radio.electret_microphone radio.headphones radio.loop_antenna
    radio.microphone_1 radio.microphone_2 resistors.attenuator resistors.magnetoresistor
    resistors.memristor_1 resistors.memristor_2 resistors.nonlinear_resistor
    resistors.potentiometer_1 resistors.potentiometer_2 resistors.resistor,_adjustable_contact
    resistors.resistor,_shunt resistors.resistor_1 resistors.resistor_2
    resistors.resistor_with_instrument_or_relay_shunt
    resistors.symmetrical_photoconductive_transducer resistors.symmetrical_varistor
    resistors.tapped_resistor resistors.trimmer_pot_1 resistors.trimmer_pot_2
    resistors.trimmer_resistor_1 resistors.trimmer_resistor_2 resistors.variable_resistor_1
    resistors.variable_resistor_2 rot_mech.armature rot_mech.automatic_return
    rot_mech.blocking_device rot_mech.clutch rot_mech.clutch_2 rot_mech.delayed_action
    rot_mech.detent rot_mech.field rot_mech.gearing rot_mech.latching_device
    rot_mech.manual_control rot_mech.mechanical_interlock rot_mech.synchro
    rot_mech.verticallabelposition=bottom rot_mech.winding_connection
    signal_sources.current_flow signal_sources.current_source signal_sources.dc_source_1
    signal_sources.equipotential signal_sources.protective_earth signal_sources.signal_ground
    signal_sources.source signal_sources.vdd signal_sources.voltage signal_sources.vss2
    thermionic_devices.diode thermionic_devices.double_diode thermionic_devices.double_triode
    thermionic_devices.pentode thermionic_devices.photocell thermionic_devices.tetrode
    thermionic_devices.triode transistors.n-channel_jfet_1 transistors.nigbt transistors.nmos
    transistors.nmos_bulk transistors.npn_transistor_1 transistors.npn_transistor_5
    transistors.p-channel_jfet_1 transistors.pigbt transistors.pmos transistors.pmos_bulk
    transistors.pnp_transistor_1 transistors.pnp_transistor_5 transmission.2_line_bus
    transmission.3_line_bus transmission.4_line_bus transmission.8_line_bus
    transmission.anticreepage_device transmission.bus_width transmission.cable_group
    transmission.eightlinebuselbow transmission.fourlinebuselbow transmission.line_cable
    transmission.line_concentrator transmission.optical_fiber2
    transmission.overground_enclosure transmission.straightbus transmission.terminal_3_phase
    transmission.testpoint transmission.threelinebuselbow transmission.twolinebuselbow
    waveforms.pulse_1 waveforms.pulse_2 waveforms.sawtooth waveforms.sine_wave
    waveforms.slow_square_wave waveforms.square_wave waveforms.step_1 waveforms.step_2
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.flowchart": `
    annotation_1 annotation_2 collate database decision delay direct_data display document2
    extract_or_measurement loop_limit merge_or_storage multi-document on-page_reference or_2
    parallel_mode sequential_data sort start_1 start_2 stored_data summing_junction terminator
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.infographic": `
    banner bannerhalffold bannersinglefold barcallout bendingarch circularcallout
    circularcallout2 circulardial cylinder flag numberedentryvert parallelogram partconcellipse
    pyramidstep ribbonbackfolded ribbondoublefolded ribbonfrontfolded ribbonrolled ribbonsimple
    shadedcube shadedpyramid shadedtriangle
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.lean_mapping": `
    airplane_7 batched_kanban boat_shipment buffer_or_safety_stock control_center crossdock
    electronic_info_flow_edge fifo_lane fifo_sequence_flow go_see_production_scheduling
    inventory_box kanban_post load_leveling manual_info_flow_edge manufacturing_process_shared
    move_by_forklift mrp_erp operator orders outside_sources physical_pull production_kanban
    push_arrow quality_problem rail_shipment schedule sequenced_pull_ball signal_kanban
    supermarket timeline2 verbal warehouse withdrawal_kanban work_cell
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.mockup": `
    buttons.button buttons.onoffbutton containers.userfemale containers.usermale
    containers.videoplayer containers.window forms.colorpicker forms.combobox forms.horslider
    forms.pwfield forms.rrect forms.searchbox forms.spinner forms.splitter graphics.barchart
    graphics.bubblechart graphics.columnchart graphics.linechart graphics.piechart
    graphics.plotchart graphics.simpleicon markup.curlybrace markup.line markup.redx
    markup.scratchout menus_and_buttons.font_style_selector_1
    menus_and_buttons.font_style_selector_2 menus_and_buttons.font_style_selector_3
    misc.copyrighticon misc.editicon misc.help_icon misc.loading_circle_1 misc.loading_circle_2
    misc.mail2 misc.map misc.pin misc.playbackcontrols misc.printicon misc.progressbar
    misc.rating misc.registeredicon misc.ruler2 misc.shareicon misc.shoppingcart
    misc.trashcanicon misc.volumeicon misc.volumeslider navigation.coverflow
    navigation.mapnavigator navigation.pagecontrol navigation.pagination navigation.scrollbar
    navigation.stepbar text.alphanumeric text.bulletedlist text.callout text.captcha
    text.stickynote2 text.textbox
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.networks": `
    biometric_reader bus business_center cloud comm_link comm_link_edge community copier
    desktop_pc external_storage firewall gamepad hub laptop load_balancer mail_server mainframe
    mobile modem monitor nas_filer patch_panel pc phone_1 phone_2 printer proxy_server rack
    radio_tower router satellite satellite_dish scanner secured security_camera server
    server_storage storage supercomputer switch tablet tape_storage terminal unsecure
    ups_enterprise ups_small usb_stick user_female user_male users video_projector
    video_projector_screen virtual_pc virtual_server virus web_server wireless_hub
    wireless_modem
  `
    .split(/\s+/)
    .filter(Boolean),
  "mxgraph.uml25": `
    actionparams behavioraction inputpin
  `
    .split(/\s+/)
    .filter(Boolean),
};

/** Seluruh pustaka ber-namespace yang dikenal draw.io, termasuk yang belum kita petakan. */
export const PUSTAKA_DRAWIO: readonly string[] = Object.keys(BENTUK_PUSTAKA_DRAWIO);

/** Jumlah total nama bentuk draw.io — penyebut kartu skor kesetaraan. */
export const JUMLAH_BENTUK_DRAWIO: number =
  BENTUK_BARE_DRAWIO.length +
  Object.values(BENTUK_PUSTAKA_DRAWIO).reduce((n, d) => n + d.length, 0);
