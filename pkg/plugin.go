package main

import (
	"github.com/grafana/grafana-plugin-model/go/datasource"

	hclog "github.com/hashicorp/go-hclog"
	plugin "github.com/hashicorp/go-plugin"
)

var pluginLogger = hclog.New(&hclog.LoggerOptions{
	Name:  "boltanalytics-backend-plugin",
	Level: hclog.LevelFromString("DEBUG"),
})

func main() {
	pluginLogger.Info("Running Bolt Analytics backend datasource")

	plugin.Serve(&plugin.ServeConfig{

		HandshakeConfig: plugin.HandshakeConfig{
			ProtocolVersion:  1,
			MagicCookieKey:   "grafana_plugin_type",
			MagicCookieValue: "datasource",
		},
		Plugins: map[string]plugin.Plugin{
			"boltanalytics-backend-plugin": &datasource.DatasourcePluginImpl{
				Plugin: &BoltDatasource{
					logger: pluginLogger,
				}},
		},

		// A non-nil value here enables gRPC serving for this plugin...
		GRPCServer: plugin.DefaultGRPCServer,
	})
}
